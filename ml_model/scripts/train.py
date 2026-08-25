"""
Training script for MB-CGCN model
"""

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import time
import math
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.mbcgcn import MBCGCN_TwoBehaviors


def bpr_loss(user_emb, pos_item_emb, neg_item_emb, tau=0.05):
    """
    Bayesian Personalized Ranking Loss with temperature scaling

    Args:
        user_emb: User embeddings
        pos_item_emb: Positive item embeddings
        neg_item_emb: Negative item embeddings
        tau: Temperature parameter (default: 0.05)

    Returns:
        BPR loss value
    """
    u_norm = F.normalize(user_emb, p=2, dim=1)
    pos_norm = F.normalize(pos_item_emb, p=2, dim=1)
    neg_norm = F.normalize(neg_item_emb, p=2, dim=1)

    pos_scores = torch.sum(u_norm * pos_norm, dim=1) / tau
    neg_scores = torch.sum(u_norm * neg_norm, dim=1) / tau

    return -torch.mean(torch.nn.functional.logsigmoid(pos_scores - neg_scores))


def extract_raw_pairs(edge_index_bidirectional, num_users):
    """
    Extract raw (un-offset) user->item pairs from a bidirectional edge_index
    built by prepare_data.py's to_bipartite_edge_index(). The tensor stores
    forward (user->item+offset) edges in the first half and the mirrored
    reverse (item+offset->user) edges in the second half - only the first
    half is needed to recover the original interaction pairs.
    """
    half = edge_index_bidirectional.size(1) // 2
    forward = edge_index_bidirectional[:, :half]
    users = forward[0]
    items = forward[1] - num_users
    return users, items


def evaluate_metrics(model, edge_cart, edge_rent_train, edge_rent_test, num_users,
                     ks=[10, 20], num_samples=1000, device='cpu'):
    """
    Evaluate model performance with Recall@K and NDCG@K

    Args:
        model: Trained model
        edge_cart: CART behavior edges
        edge_rent_train: RENT training edges
        edge_rent_test: RENT test edges
        num_users: total number of users (needed to strip the item offset)
        ks: List of K values for evaluation
        num_samples: Number of users to sample for evaluation
        device: Device to run evaluation on

    Returns:
        dict: Metrics (Recall@K, NDCG@K)
    """
    model.eval()
    with torch.no_grad():
        final_u_emb, final_i_emb = model(edge_cart, edge_rent_train)

        train_users, train_items = extract_raw_pairs(edge_rent_train, num_users)
        test_users_raw, test_items_raw = extract_raw_pairs(edge_rent_test, num_users)

        test_users = torch.unique(test_users_raw)
        num_eval = min(num_samples, len(test_users))
        eval_users = test_users[torch.randperm(len(test_users), device=test_users.device)[:num_eval]]

        metrics = {f'Recall@{k}': 0.0 for k in ks}
        metrics.update({f'NDCG@{k}': 0.0 for k in ks})

        norm_i = F.normalize(final_i_emb, p=2, dim=1)
        num_items = final_i_emb.size(0)
        max_k = min(max(ks), num_items)

        for u in eval_users:
            u_idx = u.item()
            u_emb = final_u_emb[u_idx]
            norm_u = F.normalize(u_emb, p=2, dim=0)

            scores = torch.matmul(norm_i, norm_u)

            # Exclude training items
            train_items_for_u = train_items[train_users == u]
            scores[train_items_for_u] = -float('inf')

            true_items = test_items_raw[test_users_raw == u].tolist()
            true_items_set = set(true_items)
            n_rel = len(true_items)

            if n_rel == 0:
                continue

            _, top_indices = torch.topk(scores, max_k)
            top_indices = top_indices.tolist()

            for k in ks:
                top_k = top_indices[:min(k, max_k)]
                hits = [1 if item in true_items_set else 0 for item in top_k]

                recall = sum(hits) / n_rel
                metrics[f'Recall@{k}'] += recall

                dcg = sum([hit / math.log2(i + 2) for i, hit in enumerate(hits)])
                idcg = sum([1 / math.log2(i + 2) for i in range(min(k, n_rel))])
                ndcg = dcg / idcg if idcg > 0 else 0
                metrics[f'NDCG@{k}'] += ndcg

        for key in metrics:
            metrics[key] /= num_eval

        return metrics


def train_mbcgcn(
    data_path='data/mbcgcn_graph_data.pt',
    output_path='weights/mbcgcn_manga_weights.pth',
    embed_dim=64,
    cart_layers=1,
    rent_layers=1,
    w_cart=0.1,
    w_rent=0.9,
    epochs=600,
    batch_size=400000,
    lr=0.001,
    l2_lambda=2e-2,
    eval_every=20,
    device=None
):
    """
    Train MB-CGCN model

    Args:
        data_path: Path to prepared graph data
        output_path: Path to save trained weights
        embed_dim: Embedding dimension
        cart_layers: Number of GCN layers for CART
        rent_layers: Number of GCN layers for RENT
        w_cart: Weight for CART behavior
        w_rent: Weight for RENT behavior
        epochs: Number of training epochs
        batch_size: Batch size for training
        lr: Learning rate
        l2_lambda: L2 regularization coefficient
        eval_every: Evaluate every N epochs
        device: Device to train on
    """
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    print(f"Using device: {device}")

    # Load data
    print(f"Loading data from {data_path}...")
    data = torch.load(data_path, map_location='cpu', weights_only=False)
    num_users, num_items = data['num_users'], data['num_items']
    edge_index_cart = data['edge_index_cart'].to(device)
    edge_index_rent_train = data['edge_index_rent_train'].to(device)
    edge_index_rent_test = data['edge_index_rent_test'].to(device)

    print(f"Num Users: {num_users}, Num Items: {num_items}")

    # edge_index_rent_train/test are bidirectional bipartite graphs built by
    # prepare_data.py (user->item+offset in the first half, item+offset->user
    # mirrored in the second half). Recover the raw (unoffset) pairs once here.
    rent_users_raw, rent_items_raw = extract_raw_pairs(edge_index_rent_train, num_users)

    # Calculate item popularity for negative sampling
    print("Calculating Item Popularity Distribution...")
    item_counts = torch.bincount(rent_items_raw, minlength=num_items).float()
    item_weights = torch.pow(item_counts + 1.0, 0.75)
    item_probs = item_weights / item_weights.sum()
    item_probs = item_probs.to(device)

    # Initialize model
    model = MBCGCN_TwoBehaviors(
        num_users,
        num_items,
        embed_dim=embed_dim,
        cart_layers=cart_layers,
        rent_layers=rent_layers,
        w_cart=w_cart,
        w_rent=w_rent
    ).to(device)

    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=100, gamma=0.5)

    num_interactions = rent_users_raw.size(0)

    print(f"Training for {epochs} epochs...")
    print(f"Batch size: {batch_size}, L2 lambda: {l2_lambda}")
    print("-" * 80)

    for epoch in range(epochs):
        start_time = time.time()
        model.train()
        optimizer.zero_grad()

        final_u_emb, final_i_emb = model(edge_index_cart, edge_index_rent_train)

        sample_size = min(batch_size, num_interactions)
        indices = torch.randperm(num_interactions, device=device)[:sample_size]

        users = rent_users_raw[indices]
        pos_items = rent_items_raw[indices]

        # Negative sampling
        neg_items = torch.multinomial(item_probs, sample_size, replacement=True)

        u_emb = final_u_emb[users]
        pos_emb = final_i_emb[pos_items]
        neg_emb = final_i_emb[neg_items]

        # Calculate BPR loss
        loss_bpr = bpr_loss(u_emb, pos_emb, neg_emb, tau=0.05)

        # L2 regularization
        u_emb_0 = model.user_emb.weight[users]
        pos_emb_0 = model.item_emb.weight[pos_items]
        neg_emb_0 = model.item_emb.weight[neg_items]
        loss_reg = (1/2) * (
            u_emb_0.norm(2).pow(2) +
            pos_emb_0.norm(2).pow(2) +
            neg_emb_0.norm(2).pow(2)
        ) / float(sample_size)

        loss = loss_bpr + (l2_lambda * loss_reg)

        loss.backward()
        optimizer.step()
        scheduler.step()

        torch.cuda.empty_cache()

        if (epoch + 1) % eval_every == 0:
            current_lr = scheduler.get_last_lr()[0]

            print(f"Epoch {epoch+1:03d}/{epochs} | Loss: {loss.item():.4f} | LR: {current_lr:.5f}")
            print(f"   Weights -> Cart: {w_cart:.3f} | Rent: {w_rent:.3f}")

            res = evaluate_metrics(
                model,
                edge_index_cart,
                edge_index_rent_train,
                edge_index_rent_test,
                num_users,
                device=device
            )
            print(f"   Results @10: Recall: {res['Recall@10']:.4f}, NDCG: {res['NDCG@10']:.4f}")
            print(f"   Results @20: Recall: {res['Recall@20']:.4f}, NDCG: {res['NDCG@20']:.4f}")
            print(f"   Time: {time.time()-start_time:.2f}s\n")

    print("Training Finished")

    # Final evaluation
    final_metrics = evaluate_metrics(
        model,
        edge_index_cart,
        edge_index_rent_train,
        edge_index_rent_test,
        num_users,
        device=device
    )

    # Save model
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torch.save(model.state_dict(), output_path)
    print(f"Model saved to '{output_path}'")

    # Return metrics for logging
    # edge_index_cart/rent_train store edges bidirectionally, so divide by 2
    # to report the real number of raw interactions.
    return {
        'num_users': num_users,
        'num_items': num_items,
        'num_cart': edge_index_cart.size(1) // 2,
        'num_rent': edge_index_rent_train.size(1) // 2,
        'epochs': epochs,
        'recall@10': final_metrics['Recall@10'],
        'ndcg@10': final_metrics['NDCG@10'],
        'recall@20': final_metrics['Recall@20'],
        'ndcg@20': final_metrics['NDCG@20']
    }


def main():
    """Main entry point for retraining script"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, '..', 'data', 'mbcgcn_graph_data.pt')
    output_path = os.path.join(script_dir, '..', 'weights', 'mbcgcn_manga_weights.pth')

    return train_mbcgcn(data_path=data_path, output_path=output_path)


if __name__ == "__main__":
    main()
