"""
MB-CGCN Three-Behavior Model (Phase 3)
Cascading: CLICK → CART → RENT
Weights: Adaptive (learnable) via softmax normalization
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import LGConv


class BehaviorGCN(nn.Module):
    """Single-behavior GCN using LightGCN convolution."""
    def __init__(self, num_layers=2):
        super().__init__()
        self.num_layers = num_layers
        self.convs = nn.ModuleList([LGConv() for _ in range(num_layers)])

    def forward(self, x, edge_index):
        out = x
        layer_outputs = [out]

        for conv in self.convs:
            out = conv(out, edge_index)
            layer_outputs.append(out)

        # Mean pooling across all layers (LightGCN style)
        final_out = torch.stack(layer_outputs, dim=0).mean(dim=0)
        return final_out


class MBCGCN_ThreeBehaviors(nn.Module):
    """
    Multi-Behavior Cascading GCN with 3 behaviors.

    Architecture:
        CLICK embeddings (1 layer GCN)
            ↓ trans_click2cart
        CART embeddings (1 layer GCN, initialized from click cascade)
            ↓ trans_cart2rent
        RENT embeddings (2 layers GCN, initialized from cart cascade)
            ↓
        final = softmax(w_click, w_cart, w_rent) • (click, cart, rent)

    Args:
        adaptive_weights: If True, use learnable weights via softmax. If False, use fixed weights.
    """
    def __init__(
        self,
        num_users: int,
        num_items: int,
        embed_dim: int = 64,
        click_layers: int = 1,
        cart_layers: int = 1,
        rent_layers: int = 2,
        adaptive_weights: bool = True,
        w_click: float = 0.05,
        w_cart: float = 0.15,
        w_rent: float = 0.80
    ):
        super().__init__()

        self.num_users = num_users
        self.num_items = num_items
        self.embed_dim = embed_dim
        self.adaptive_weights = adaptive_weights

        # Embedding layers (shared initialization)
        self.user_embedding = nn.Embedding(num_users, embed_dim)
        self.item_embedding = nn.Embedding(num_items, embed_dim)

        # GCN for each behavior
        self.gcn_click = BehaviorGCN(num_layers=click_layers)
        self.gcn_cart  = BehaviorGCN(num_layers=cart_layers)
        self.gcn_rent  = BehaviorGCN(num_layers=rent_layers)

        # Cascade transformations
        self.trans_click2cart = nn.Linear(embed_dim, embed_dim, bias=False)
        self.trans_cart2rent  = nn.Linear(embed_dim, embed_dim, bias=False)

        # Behavior weights
        if adaptive_weights:
            # Learnable weight logits (before softmax)
            # Initialize to approximate [0.05, 0.15, 0.80] after softmax
            # log(0.05) ≈ -3.0, log(0.15) ≈ -1.9, log(0.80) ≈ -0.22
            # Scale up for numerical stability: [0.5, 1.5, 3.0]
            self.weight_logits = nn.Parameter(torch.tensor([0.5, 1.5, 3.0]))
        else:
            # Fixed weights (magic numbers)
            self.register_buffer('w_click', torch.tensor(w_click))
            self.register_buffer('w_cart', torch.tensor(w_cart))
            self.register_buffer('w_rent', torch.tensor(w_rent))

        self._init_weights()

    def _init_weights(self):
        """Xavier uniform initialization for embeddings."""
        nn.init.xavier_uniform_(self.user_embedding.weight)
        nn.init.xavier_uniform_(self.item_embedding.weight)
        nn.init.xavier_uniform_(self.trans_click2cart.weight)
        nn.init.xavier_uniform_(self.trans_cart2rent.weight)

    def get_behavior_weights(self):
        """
        Get current behavior weights for logging/monitoring.

        Returns:
            (w_click, w_cart, w_rent): tuple of floats
        """
        if self.adaptive_weights:
            weights = F.softmax(self.weight_logits, dim=0)
            return weights[0].item(), weights[1].item(), weights[2].item()
        else:
            return self.w_click.item(), self.w_cart.item(), self.w_rent.item()

    def forward(self, edge_index_click, edge_index_cart, edge_index_rent):
        """
        Args:
            edge_index_click: [2, E_click] — user-item edges for CLICK behavior
            edge_index_cart:  [2, E_cart]  — user-item edges for ADD_CART behavior
            edge_index_rent:  [2, E_rent]  — user-item edges for RENT behavior

        Returns:
            user_embed_final: [num_users, embed_dim]
            item_embed_final: [num_items, embed_dim]
        """
        # Initial embeddings
        x = torch.cat([self.user_embedding.weight, self.item_embedding.weight], dim=0)

        # ===== CLICK behavior =====
        x_click = self.gcn_click(x, edge_index_click)

        # ===== CART behavior (cascaded from CLICK) =====
        x_cart_init = self.trans_click2cart(x_click)
        x_cart = self.gcn_cart(x_cart_init, edge_index_cart)

        # ===== RENT behavior (cascaded from CART) =====
        x_rent_init = self.trans_cart2rent(x_cart)
        x_rent = self.gcn_rent(x_rent_init, edge_index_rent)

        # ===== Weighted combination =====
        if self.adaptive_weights:
            weights = F.softmax(self.weight_logits, dim=0)
            w_click, w_cart, w_rent = weights[0], weights[1], weights[2]
        else:
            w_click, w_cart, w_rent = self.w_click, self.w_cart, self.w_rent

        x_final = w_click * x_click + w_cart * x_cart + w_rent * x_rent

        user_embed_final = x_final[:self.num_users]
        item_embed_final = x_final[self.num_users:]

        return user_embed_final, item_embed_final

    def get_embedding(self, edge_index_click, edge_index_cart, edge_index_rent):
        """Alias for forward (used during inference)."""
        return self.forward(edge_index_click, edge_index_cart, edge_index_rent)
