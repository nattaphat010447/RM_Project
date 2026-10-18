"""
Training script for baseline models (MF and LightGCN)
"""

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import time
import math
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.baselines import Baseline_MF, Baseline_LightGCN


def bpr_loss(user_emb, pos_item_emb, neg_item_emb, tau=0.05):
    """BPR Loss with temperature scaling"""
    u_norm = F.normalize(user_emb, p=2, dim=1)
    pos_norm = F.normalize(pos_item_emb, p=2, dim=1)
    neg_norm = F.normalize(neg_item_emb, p=2, dim=1)

    pos_scores = torch.sum(u_norm * pos_norm, dim=1) / tau
    neg_scores = torch.sum(u_norm * neg_norm, dim=1) / tau

    return -torch.mean(torch.nn.functional.logsigmoid(pos_scores - neg_scores))


def extract_raw_pairs(edge_index_bidirectional, num_users):
    """
    Extract raw (un-offset) user->item pairs from a bidirectional edge_index
    built by prepare_data.py's to_bipartite_edge_index(). Only the first half
    (forward user->item+offset edges) is needed to recover original pairs.
    """
    half = edge_index_bidirectional.size(1) // 2
    forward = edge_index_bidirectional[:, :half]
    users = forward[0]
    items = forward[1] - num_users
    return users, items


def evaluate_metrics(final_u_emb, final_i_emb, edge_rent_train, edge_rent_test, num_users,
                     ks=[10, 20], num_samples=1000):
    """Evaluate Recall@K and NDCG@K"""
    with torch.no_grad():
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


def train_baseline(
    model,
    model_name,
    device,
    edge_train,
    edge_test,
    num_users,
    num_items,
    item_probs,
    epochs=600,
    batch_size=400000,
    lr=0.001,
    l2_lambda=2e-2,
    eval_every=20
):
    """
    Train baseline model

    Args:
        model: Model instance (Baseline_MF or Baseline_LightGCN)
        model_name: Name for logging
        device: Device to train on
        edge_train: Training edges
        edge_test: Test edges
        num_users: Number of users
        num_items: Number of items
        item_probs: Item sampling probabilities
        epochs: Number of epochs
        batch_size: Batch size
        lr: Learning rate
        l2_lambda: L2 regularization
        eval_every: Evaluate every N epochs
    """
    print(f"\n{'='*60}\nTraining: {model_name}\n{'='*60}")

    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=100, gamma=0.5)

    # edge_train is bidirectional (user->item+offset, then mirrored
    # item+offset->user) - only sample positives from the raw forward pairs
    train_users_raw, train_items_raw = extract_raw_pairs(edge_train, num_users)
    num_interactions = train_users_raw.size(0)

    for epoch in range(epochs):
        start_time = time.time()
        model.train()
        optimizer.zero_grad()

        if isinstance(model, Baseline_MF):
            final_u_emb, final_i_emb = model.get_embeddings()
        else:
            final_u_emb, final_i_emb = model(edge_train)

        sample_size = min(batch_size, num_interactions)
        indices = torch.randperm(num_interactions, device=device)[:sample_size]

        users = train_users_raw[indices]
        pos_items = train_items_raw[indices]
        neg_items = torch.multinomial(item_probs, sample_size, replacement=True)

        u_emb = final_u_emb[users]
        pos_emb = final_i_emb[pos_items]
        neg_emb = final_i_emb[neg_items]

        loss_bpr = bpr_loss(u_emb, pos_emb, neg_emb, tau=0.05)

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

        if (epoch + 1) % eval_every == 0:
            model.eval()
            if isinstance(model, Baseline_MF):
                eval_u, eval_i = model.get_embeddings()
            else:
                eval_u, eval_i = model(edge_train)

            res = evaluate_metrics(eval_u, eval_i, edge_train, edge_test, num_users)
            current_lr = scheduler.get_last_lr()[0]

            print(f"Epoch {epoch+1:03d}/{epochs} | Loss: {loss.item():.4f} | LR: {current_lr:.5f}")
            print(f"   Recall@10: {res['Recall@10']:.4f} | NDCG@10: {res['NDCG@10']:.4f}")
            print(f"   Recall@20: {res['Recall@20']:.4f} | NDCG@20: {res['NDCG@20']:.4f}")
            print(f"   Time: {time.time()-start_time:.2f}s")

    return model


def train_all_baselines(
    data_path='data/mbcgcn_graph_data.pt',
    output_dir='weights/',
    embed_dim=64,
    epochs=600,
    device=None
):
    """Train both baseline models"""
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    print(f"Using device: {device}")

    # Load data
    data = torch.load(data_path, weights_only=True)
    num_users, num_items = data['num_users'], data['num_items']
    edge_index_rent_train = data['edge_index_rent_train'].to(device)
    edge_index_rent_test = data['edge_index_rent_test'].to(device)

    # edge_index_rent_train is bidirectional; recover raw item ids for popularity
    _, rent_items_raw = extract_raw_pairs(edge_index_rent_train, num_users)

    # Calculate item popularity
    item_counts = torch.bincount(rent_items_raw, minlength=num_items).float()
    item_weights = torch.pow(item_counts + 1.0, 0.75)
    item_probs = item_weights / item_weights.sum()
    item_probs = item_probs.to(device)

    # Train MF
    model_mf = Baseline_MF(num_users, num_items, embed_dim=embed_dim).to(device)
    model_mf = train_baseline(
        model=model_mf,
        model_name="Baseline MF",
        device=device,
        edge_train=edge_index_rent_train,
        edge_test=edge_index_rent_test,
        num_users=num_users,
        num_items=num_items,
        item_probs=item_probs,
        epochs=epochs
    )
    os.makedirs(output_dir, exist_ok=True)
    torch.save(model_mf.state_dict(), f"{output_dir}/baseline_mf_weights.pth")
    print(f"Saved Baseline MF to {output_dir}/baseline_mf_weights.pth")

    # Train LightGCN
    model_gcn = Baseline_LightGCN(num_users, num_items, embed_dim=embed_dim, num_layers=1).to(device)
    model_gcn = train_baseline(
        model=model_gcn,
        model_name="Baseline LightGCN",
        device=device,
        edge_train=edge_index_rent_train,
        edge_test=edge_index_rent_test,
        num_users=num_users,
        num_items=num_items,
        item_probs=item_probs,
        epochs=epochs
    )
    torch.save(model_gcn.state_dict(), f"{output_dir}/baseline_lightgcn_weights.pth")
    print(f"Saved Baseline LightGCN to {output_dir}/baseline_lightgcn_weights.pth")

    print("\nAll baselines trained successfully!")


if __name__ == "__main__":
    train_all_baselines(
        data_path='../data/mbcgcn_graph_data.pt',
        output_dir='../weights/'
    )
