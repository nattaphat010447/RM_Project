"""
Training script for MB-CGCN v2 (3 behaviors: CLICK  CART  RENT)

Usage:
    python train_v2.py --epochs 600 --batch_size 400000 --embed_dim 64
"""
import os
import sys
import argparse
import torch
import torch.nn.functional as F
from tqdm import tqdm

# Add ml_model to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.mbcgcn_v2 import MBCGCN_ThreeBehaviors


def compute_bpr_loss(pos_scores, neg_scores, temperature=0.05):
    """
    Bayesian Personalized Ranking loss with temperature scaling.

    Args:
        pos_scores: [batch_size]  scores for positive items
        neg_scores: [batch_size]  scores for negative items
        temperature: softmax temperature (lower = sharper)

    Returns:
        BPR loss (scalar)
    """
    logits = (pos_scores - neg_scores) / temperature
    loss = -F.logsigmoid(logits).mean()
    return loss


def negative_sampling(num_users, num_items, pos_user_items, num_negatives=1, popularity_power=0.75):
    """
    Popularity-biased negative sampling.

    Args:
        num_users: total users
        num_items: total items
        pos_user_items: dict {user_idx: set of pos item indices}
        num_negatives: negatives per positive
        popularity_power: 0.75 for less bias toward popular items

    Returns:
        neg_items: [batch_size * num_negatives]
    """
    # Compute item popularity (degree)
    item_counts = torch.zeros(num_items)
    for items in pos_user_items.values():
        for item in items:
            item_counts[item] += 1

    # Power-law distribution
    item_probs = (item_counts + 1) ** popularity_power
    item_probs = item_probs / item_probs.sum()

    neg_items = []
    for user_idx in pos_user_items.keys():
        pos_set = pos_user_items[user_idx]
        sampled = []
        while len(sampled) < num_negatives:
            neg = torch.multinomial(item_probs, num_negatives * 2, replacement=True)
            neg = neg[~torch.isin(neg, torch.tensor(list(pos_set)))]
            sampled.extend(neg.tolist())
        neg_items.extend(sampled[:num_negatives])

    return torch.tensor(neg_items, dtype=torch.long)


def evaluate_model(model, edge_click, edge_cart, edge_rent, test_data, device, k=10):
    """
    Evaluate Recall@K and NDCG@K on test set.

    Args:
        model: MBCGCN_ThreeBehaviors
        edge_click/cart/rent: training edges for each behavior
        test_data: dict with test edges (for RENT behavior only)
        device: torch device
        k: top-K

    Returns:
        recall@k, ndcg@k
    """
    model.eval()
    with torch.no_grad():
        user_embed, item_embed = model(edge_click, edge_cart, edge_rent)

        # Build test ground truth (RENT behavior only)
        test_edges = test_data['edge_index_rent_test']
        if test_edges.size(1) == 0:
            return 0.0, 0.0

        # Filter test edges to useritem only (first half of bipartite edges)
        test_edges = test_edges[:, :test_edges.size(1) // 2]

        test_user_items = {}
        for u, m in test_edges.t().tolist():
            m_original = m - model.num_users  # remove offset
            if m_original >= 0:
                if u not in test_user_items:
                    test_user_items[u] = []
                test_user_items[u].append(m_original)

        recalls, ndcgs = [], []

        for user_idx, true_items in test_user_items.items():
            if user_idx >= model.num_users:
                continue

            u_emb = user_embed[user_idx]
            scores = torch.matmul(item_embed, u_emb)

            # Top-K items (cap k at catalog size to avoid a topk() crash on small catalogs)
            effective_k = min(k, scores.size(0))
            topk_items = torch.topk(scores, effective_k).indices.cpu().tolist()

            true_set = set(true_items)
            hits = len(set(topk_items) & true_set)

            # Recall@K = hits / total relevant items (not capped at k)
            recall = hits / len(true_set)
            recalls.append(recall)

            # NDCG@K
            dcg = sum([1.0 / torch.log2(torch.tensor(i + 2.0)) for i, item in enumerate(topk_items) if item in true_set])
            idcg = sum([1.0 / torch.log2(torch.tensor(i + 2.0)) for i in range(min(len(true_set), k))])
            ndcg = dcg / idcg if idcg > 0 else 0.0
            ndcgs.append(ndcg.item() if isinstance(ndcg, torch.Tensor) else ndcg)

        avg_recall = sum(recalls) / len(recalls) if recalls else 0.0
        avg_ndcg = sum(ndcgs) / len(ndcgs) if ndcgs else 0.0

        return avg_recall, avg_ndcg


def train_v2(
    data_path='ml_model/data/mbcgcn_v2_graph_data.pt',
    output_path='ml_model/weights/mbcgcn_v2_manga_weights.pth',
    epochs=600,
    batch_size=400000,
    embed_dim=64,
    lr=0.001,
    l2_reg=0.02,
    device='cpu'
):
    """
    Train MB-CGCN v2 model with 3 behaviors.

    Returns:
        final_metrics: dict with recall@10, ndcg@10
    """
    print(" Starting MB-CGCN v2 training (3 behaviors)...")

    # Load data
    data = torch.load(data_path, weights_only=False)
    num_users = data['num_users']
    num_items = data['num_items']

    edge_click_train = data['edge_index_click_train'].to(device)
    edge_cart_train = data['edge_index_cart_train'].to(device)
    edge_rent_train = data['edge_index_rent_train'].to(device)

    print(f" Data loaded:")
    print(f"   Users: {num_users}, Items: {num_items}")
    print(f"   CLICK edges: {edge_click_train.size(1) // 2}")
    print(f"   CART edges:  {edge_cart_train.size(1) // 2}")
    print(f"   RENT edges:  {edge_rent_train.size(1) // 2}")

    # Check minimum data requirement
    if edge_click_train.size(1) < 100 or edge_rent_train.size(1) < 100:
        print(" Insufficient data for training v2 model.")
        print("   Need at least 50 CLICK and 50 RENT interactions.")
        return {'recall@10': 0.0, 'ndcg@10': 0.0, 'error': 'insufficient_data'}

    # Initialize model
    model = MBCGCN_ThreeBehaviors(
        num_users=num_users,
        num_items=num_items,
        embed_dim=embed_dim,
        click_layers=1,
        cart_layers=1,
        rent_layers=2,
        adaptive_weights=True  # Enable learnable weights
    ).to(device)

    # Log initial weights
    w_c, w_ca, w_r = model.get_behavior_weights()
    print(f"  Initial weights: CLICK={w_c:.4f}, CART={w_ca:.4f}, RENT={w_r:.4f}")

    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=l2_reg)

    # Build positive user-item dict (RENT only, for negative sampling)
    rent_edges_ui = edge_rent_train[:, :edge_rent_train.size(1) // 2]
    pos_user_items = {}
    for u, m in rent_edges_ui.t().tolist():
        m_original = m - num_users
        if m_original >= 0:
            if u not in pos_user_items:
                pos_user_items[u] = set()
            pos_user_items[u].add(m_original)

    print(f" Training for {epochs} epochs...")

    best_recall = 0.0

    for epoch in tqdm(range(epochs), desc="Training"):
        model.train()

        # Forward pass
        user_embed, item_embed = model(edge_click_train, edge_cart_train, edge_rent_train)

        # Sample positive pairs (from RENT behavior)
        if len(pos_user_items) == 0:
            print(" No positive RENT interactions found.")
            break

        pos_users = list(pos_user_items.keys())[:batch_size]
        pos_items = []
        for u in pos_users:
            items = list(pos_user_items[u])
            pos_items.append(items[torch.randint(0, len(items), (1,)).item()])

        pos_users = torch.tensor(pos_users, dtype=torch.long, device=device)
        pos_items = torch.tensor(pos_items, dtype=torch.long, device=device)

        # Negative sampling
        neg_items = negative_sampling(num_users, num_items, pos_user_items, num_negatives=1)
        neg_items = neg_items[:len(pos_users)].to(device)

        # Compute scores
        pos_scores = (user_embed[pos_users] * item_embed[pos_items]).sum(dim=1)
        neg_scores = (user_embed[pos_users] * item_embed[neg_items]).sum(dim=1)

        # BPR loss
        loss = compute_bpr_loss(pos_scores, neg_scores, temperature=0.05)

        # Backprop
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        # Evaluate every 50 epochs
        if (epoch + 1) % 50 == 0:
            recall, ndcg = evaluate_model(model, edge_click_train, edge_cart_train, edge_rent_train, data, device, k=10)
            w_c, w_ca, w_r = model.get_behavior_weights()
            print(f"\n Epoch {epoch+1}/{epochs} | Loss: {loss.item():.4f} | Recall@10: {recall:.4f} | NDCG@10: {ndcg:.4f}")
            print(f"   Weights: CLICK={w_c:.4f}, CART={w_ca:.4f}, RENT={w_r:.4f}")

            if recall > best_recall:
                best_recall = recall

    # Final evaluation
    final_recall, final_ndcg = evaluate_model(model, edge_click_train, edge_cart_train, edge_rent_train, data, device, k=10)
    w_c, w_ca, w_r = model.get_behavior_weights()

    print(f"\n Training complete!")
    print(f"   Final Recall@10: {final_recall:.4f}")
    print(f"   Final NDCG@10:   {final_ndcg:.4f}")
    print(f"   Final Weights: CLICK={w_c:.4f}, CART={w_ca:.4f}, RENT={w_r:.4f}")

    # Save model
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torch.save({
        'model_state_dict': model.state_dict(),
        'num_users': num_users,
        'num_items': num_items,
        'embed_dim': embed_dim,
        'recall@10': final_recall,
        'ndcg@10': final_ndcg,
        'learned_weights': {
            'click': w_c,
            'cart': w_ca,
            'rent': w_r
        }
    }, output_path)
    print(f" Model saved to: {output_path}")

    return {
        'recall@10': final_recall,
        'ndcg@10': final_ndcg,
        'learned_weights': {'click': w_c, 'cart': w_ca, 'rent': w_r}
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=600)
    parser.add_argument('--batch_size', type=int, default=400000)
    parser.add_argument('--embed_dim', type=int, default=64)
    parser.add_argument('--lr', type=float, default=0.001)
    parser.add_argument('--l2_reg', type=float, default=0.02)
    parser.add_argument('--device', type=str, default='cpu')
    parser.add_argument('--data_path', type=str, default=None)
    parser.add_argument('--output_path', type=str, default=None)
    args = parser.parse_args()

    # Resolve defaults relative to this script's directory, not the caller's cwd
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = args.data_path or os.path.join(script_dir, '..', 'data', 'mbcgcn_v2_graph_data.pt')
    output_path = args.output_path or os.path.join(script_dir, '..', 'weights', 'mbcgcn_v2_manga_weights.pth')

    train_v2(
        data_path=data_path,
        output_path=output_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        embed_dim=args.embed_dim,
        lr=args.lr,
        l2_reg=args.l2_reg,
        device=args.device
    )
