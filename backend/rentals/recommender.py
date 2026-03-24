import torch
import torch.nn as nn
from torch_geometric.nn import LGConv
import os

# --- 1. โครงสร้างโมเดล (ต้องประกาศให้ตรงกับไฟล์ที่ใช้เทรน 100%) ---
class BehaviorGCN(nn.Module):
    def __init__(self, num_layers=2):
        super(BehaviorGCN, self).__init__()
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        embs = [x]
        for conv in self.convs:
            x = conv(x, edge_index)
            embs.append(x)
        return torch.stack(embs, dim=1).mean(dim=1)

class MBCGCN_TwoBehaviors(nn.Module):
    def __init__(self, num_users, num_items, embed_dim, num_layers=2):
        super(MBCGCN_TwoBehaviors, self).__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)
        
        self.gcn_cart = BehaviorGCN(num_layers=num_layers)
        self.gcn_rent = BehaviorGCN(num_layers=num_layers)
        
        self.trans_user_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_item_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        
    def forward(self, edge_index_cart, edge_index_rent):
        u_emb_0 = self.user_emb.weight
        i_emb_0 = self.item_emb.weight
        num_u = u_emb_0.size(0)
        num_i = i_emb_0.size(0)
        
        # Block 1: Cart
        cart_emb = self.gcn_cart(torch.cat([u_emb_0, i_emb_0]), edge_index_cart)
        cart_u_emb, cart_i_emb = torch.split(cart_emb, [num_u, num_i])
        
        # Transform & Block 2: Rent
        u_emb_rent_init = self.trans_user_cart2rent(cart_u_emb)
        i_emb_rent_init = self.trans_item_cart2rent(cart_i_emb)
        rent_emb = self.gcn_rent(torch.cat([u_emb_rent_init, i_emb_rent_init]), edge_index_rent)
        rent_u_emb, rent_i_emb = torch.split(rent_emb, [num_u, num_i])
        
        return cart_u_emb + rent_u_emb, cart_i_emb + rent_i_emb

# --- 2. Recommender Service (Singleton) ---
class RecommenderService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RecommenderService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        print("⚙️  MBRS: Initializing Recommender Service...")
        # กำหนด Path ไปยังไฟล์โมเดลใน Docker
        base_path = os.path.join(os.path.dirname(__file__), 'ml_models')
        weight_path = os.path.join(base_path, 'mbcgcn_model_weights.pth')
        data_path = os.path.join(base_path, 'mbcgcn_graph_data.pt')

        # ตรวจเช็ค Device (GPU/CPU)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # โหลด Graph Data (ตัวเลข ID และ Mapping)
        self.graph_data = torch.load(data_path, map_location=self.device, weights_only=False)
        
        # สร้าง Model และโหลด Weights
        self.num_users = self.graph_data['num_users']
        self.num_items = self.graph_data['num_items']
        self.user_mapping = self.graph_data['user_mapping']
        self.item_mapping = self.graph_data['item_mapping']
        self.rev_item_mapping = {idx: iid for iid, idx in self.item_mapping.items()}

        self.model = MBCGCN_TwoBehaviors(self.num_users, self.num_items, embed_dim=32)
        self.model.load_state_dict(torch.load(weight_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        print(f"✅ MBRS: Model loaded successfully on {self.device}")

    def get_recommendations(self, username, top_k=10):
        """
        Input: username ของ Django User
        Output: List ของ mbrs_id (ID จาก Anime.csv)
        """
        # 1. เช็คว่า User นี้มีในระบบแนะนำไหม (ป้องกัน Cold Start)
        if username not in self.user_mapping:
            return []

        user_idx = self.user_mapping[username]
        
        with torch.no_grad():
            # ดึง Edge Indices ของพฤติกรรมต่างๆ
            edge_cart = self.graph_data['edge_index_cart'].to(self.device)
            edge_rent = self.graph_data['edge_index_rent_train'].to(self.device)
            
            # 2. Forward Pass เพื่อสร้าง Embedding ล่าสุด
            final_u_emb, final_i_emb = self.model(edge_cart, edge_rent)
            
            # 3. คำนวณความน่าจะเป็น (Dot Product)
            u_emb = final_u_emb[user_idx]
            scores = torch.matmul(final_i_emb, u_emb)
            
            # 4. ดึง Top K มังงะที่แนะนำ
            top_indices = torch.topk(scores, top_k).indices.cpu().numpy()
            
            # แปลง Index กลับเป็น ID ดั้งเดิม (mbrs_id)
            recommended_ids = [self.rev_item_mapping[idx] for idx in top_indices]
            return recommended_ids