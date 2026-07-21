import torch
import torch.nn as nn
from torch_geometric.nn import LGConv
import os

class BehaviorGCN(nn.Module):
    def __init__(self, num_layers=1):
        super(BehaviorGCN, self).__init__()
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        embs = [x]
        for conv in self.convs:
            x = conv(x, edge_index)
            embs.append(x)
        return torch.stack(embs, dim=1).mean(dim=1)

class MBCGCN_TwoBehaviors(nn.Module):
    def __init__(self, num_users, num_items, embed_dim, cart_layers=1, rent_layers=1):
        super(MBCGCN_TwoBehaviors, self).__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)
        
        self.gcn_cart = BehaviorGCN(num_layers=cart_layers)
        self.gcn_rent = BehaviorGCN(num_layers=rent_layers)
        
        self.trans_user_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_item_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        
        self.w_cart = 0.1
        self.w_rent = 0.9
        
    def forward(self, edge_index_cart, edge_index_rent):
        u_emb_0 = self.user_emb.weight
        i_emb_0 = self.item_emb.weight
        num_u = u_emb_0.size(0)
        num_i = i_emb_0.size(0)
        
        cart_emb = self.gcn_cart(torch.cat([u_emb_0, i_emb_0]), edge_index_cart)
        cart_u_emb, cart_i_emb = torch.split(cart_emb, [num_u, num_i])
        
        u_emb_rent_init = self.trans_user_cart2rent(cart_u_emb)
        i_emb_rent_init = self.trans_item_cart2rent(cart_i_emb)
        
        rent_emb = self.gcn_rent(torch.cat([u_emb_rent_init, i_emb_rent_init]), edge_index_rent)
        rent_u_emb, rent_i_emb = torch.split(rent_emb, [num_u, num_i])
        
        final_u_emb = (self.w_cart * cart_u_emb) + (self.w_rent * rent_u_emb)
        final_i_emb = (self.w_cart * cart_i_emb) + (self.w_rent * rent_i_emb)
        
        return final_u_emb, final_i_emb

class RecommenderService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RecommenderService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        print("ระบบกำลังเริ่มต้น Recommender Service")
        base_path = os.path.join(os.path.dirname(__file__), 'ml_models')
        weight_path = os.path.join(base_path, 'mbcgcn_model_weights.pth')
        data_path = os.path.join(base_path, 'mbcgcn_graph_data.pt')

        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.graph_data = torch.load(data_path, map_location=self.device, weights_only=False)
        
        self.num_users = self.graph_data['num_users']
        self.num_items = self.graph_data['num_items']
        self.user_mapping = self.graph_data['user_mapping']
        self.item_mapping = self.graph_data['item_mapping']
        self.rev_item_mapping = {idx: iid for iid, idx in self.item_mapping.items()}

        self.model = MBCGCN_TwoBehaviors(self.num_users, self.num_items, embed_dim=32, cart_layers=1, rent_layers=1)
        self.model.load_state_dict(torch.load(weight_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        print(f"ดำเนินการโหลดโมเดลเสร็จสิ้นบนอุปกรณ์ {self.device}")

    def get_recommendations(self, username, top_k=10):
        if username not in self.user_mapping:
            return []

        user_idx = self.user_mapping[username]
        
        with torch.no_grad():
            edge_cart = self.graph_data['edge_index_cart'].to(self.device)
            edge_rent = self.graph_data['edge_index_rent_train'].to(self.device)
            
            final_u_emb, final_i_emb = self.model(edge_cart, edge_rent)
            
            u_emb = final_u_emb[user_idx]
            scores = torch.matmul(final_i_emb, u_emb)
            
            top_indices = torch.topk(scores, top_k).indices.cpu().numpy()
            
            recommended_ids = [self.rev_item_mapping[idx] for idx in top_indices]
            return recommended_ids
    
    def get_item_based_recommendations(self, history_mbrs_ids, top_k=10):
        if not history_mbrs_ids:
            return []

        valid_item_idxs = [self.item_mapping[idx] for idx in history_mbrs_ids if idx in self.item_mapping]
        
        if not valid_item_idxs:
            return []

        with torch.no_grad():
            edge_cart = self.graph_data['edge_index_cart'].to(self.device)
            edge_rent = self.graph_data['edge_index_rent_train'].to(self.device)
            _, final_i_emb = self.model(edge_cart, edge_rent)

            history_embs = final_i_emb[valid_item_idxs] 
            pseudo_user_emb = history_embs.mean(dim=0) 
            
            scores = torch.matmul(final_i_emb, pseudo_user_emb)
            scores[valid_item_idxs] = -float('inf')

            top_indices = torch.topk(scores, top_k).indices.cpu().numpy()
            return [self.rev_item_mapping[idx] for idx in top_indices]