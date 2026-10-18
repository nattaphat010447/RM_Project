"""
MB-CGCN: Multi-Behavior Cascading Graph Convolutional Network
Architecture for manga recommendation system
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


class MBCGCN_TwoBehaviors(nn.Module):
    """
    Multi-Behavior Cascading GCN with two behaviors: CART and RENT

    Args:
        num_users (int): Number of users
        num_items (int): Number of items (mangas)
        embed_dim (int): Embedding dimension (default: 64)
        cart_layers (int): Number of GCN layers for CART behavior
        rent_layers (int): Number of GCN layers for RENT behavior
        w_cart (float): Weight for CART behavior (default: 0.1)
        w_rent (float): Weight for RENT behavior (default: 0.9)
    """

    def __init__(
        self,
        num_users,
        num_items,
        embed_dim=64,
        cart_layers=1,
        rent_layers=1,
        w_cart=0.1,
        w_rent=0.9
    ):
        super(MBCGCN_TwoBehaviors, self).__init__()

        # Embeddings
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)

        nn.init.xavier_uniform_(self.user_emb.weight)
        nn.init.xavier_uniform_(self.item_emb.weight)

        # GCN for each behavior
        self.gcn_cart = BehaviorGCN(num_layers=cart_layers)
        self.gcn_rent = BehaviorGCN(num_layers=rent_layers)

        # Transform layers: CART → RENT
        self.trans_user_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_item_cart2rent = nn.Linear(embed_dim, embed_dim, bias=False)
        nn.init.xavier_uniform_(self.trans_user_cart2rent.weight)
        nn.init.xavier_uniform_(self.trans_item_cart2rent.weight)

        # Fixed weights for combining behaviors
        self.w_cart = w_cart
        self.w_rent = w_rent

    def forward(self, edge_index_cart, edge_index_rent):
        """
        Forward pass

        Args:
            edge_index_cart: Edge indices for CART behavior [2, num_edges]
            edge_index_rent: Edge indices for RENT behavior [2, num_edges]

        Returns:
            tuple: (final_user_emb, final_item_emb)
        """
        u_emb_0 = self.user_emb.weight
        i_emb_0 = self.item_emb.weight
        num_u = u_emb_0.size(0)
        num_i = i_emb_0.size(0)

        # CART behavior propagation
        cart_emb = self.gcn_cart(torch.cat([u_emb_0, i_emb_0]), edge_index_cart)
        cart_u_emb, cart_i_emb = torch.split(cart_emb, [num_u, num_i])

        # Transform CART embeddings for RENT
        u_emb_rent_init = self.trans_user_cart2rent(cart_u_emb)
        i_emb_rent_init = self.trans_item_cart2rent(cart_i_emb)

        # RENT behavior propagation
        rent_emb = self.gcn_rent(
            torch.cat([u_emb_rent_init, i_emb_rent_init]),
            edge_index_rent
        )
        rent_u_emb, rent_i_emb = torch.split(rent_emb, [num_u, num_i])

        # Combine behaviors with fixed weights
        final_u_emb = (self.w_cart * cart_u_emb) + (self.w_rent * rent_u_emb)
        final_i_emb = (self.w_cart * cart_i_emb) + (self.w_rent * rent_i_emb)

        return final_u_emb, final_i_emb
