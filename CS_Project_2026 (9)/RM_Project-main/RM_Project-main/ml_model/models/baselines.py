"""
Baseline models for comparison with MB-CGCN
"""

import torch
import torch.nn as nn
from torch_geometric.nn import LGConv


class BehaviorGCN(nn.Module):
    """Graph Convolutional Network for single behavior"""

    def __init__(self, num_layers=1):
        super(BehaviorGCN, self).__init__()
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        embs = [x]
        for conv in self.convs:
            x = conv(x, edge_index)
            embs.append(x)
        return torch.stack(embs, dim=1).mean(dim=1)


class Baseline_MF(nn.Module):
    """
    Matrix Factorization Baseline
    Simple collaborative filtering without graph structure
    """

    def __init__(self, num_users, num_items, embed_dim=64):
        super(Baseline_MF, self).__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)

        nn.init.xavier_uniform_(self.user_emb.weight)
        nn.init.xavier_uniform_(self.item_emb.weight)

    def get_embeddings(self):
        """Return raw embeddings without graph propagation"""
        return self.user_emb.weight, self.item_emb.weight


class Baseline_LightGCN(nn.Module):
    """
    LightGCN Baseline
    Single-behavior GCN using only RENT data
    """

    def __init__(self, num_users, num_items, embed_dim=64, num_layers=1):
        super(Baseline_LightGCN, self).__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)

        nn.init.xavier_uniform_(self.user_emb.weight)
        nn.init.xavier_uniform_(self.item_emb.weight)

        self.gcn_rent = BehaviorGCN(num_layers=num_layers)

    def forward(self, edge_index_rent):
        """
        Forward pass using only RENT behavior

        Args:
            edge_index_rent: Edge indices for RENT behavior [2, num_edges]

        Returns:
            tuple: (user_emb, item_emb)
        """
        u_emb_0 = self.user_emb.weight
        i_emb_0 = self.item_emb.weight
        num_u = u_emb_0.size(0)
        num_i = i_emb_0.size(0)

        rent_emb = self.gcn_rent(torch.cat([u_emb_0, i_emb_0]), edge_index_rent)
        return torch.split(rent_emb, [num_u, num_i])
