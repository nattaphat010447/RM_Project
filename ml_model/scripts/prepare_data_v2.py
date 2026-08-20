"""
Prepare training data for MB-CGCN v2 (3 behaviors) from Django database.

Behaviors:
- CLICK: UserBehaviorLog with event_type='CLICK'
- ADD_CART: UserBehaviorLog with event_type='ADD_CART'
- RENT: UserBehaviorLog with event_type='RENT' (auto-logged on checkout)

Output:
- ml_model/data/mbcgcn_v2_graph_data.pt containing:
  - edge_index_click_train/test
  - edge_index_cart_train/test
  - edge_index_rent_train/test
  - num_users, num_items
  - user_id_map, manga_id_map
"""
import os
import sys
import django
import torch
from collections import defaultdict

# Setup Django environment
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
backend_path = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.models import UserBehaviorLog, User, Manga


def prepare_v2_data(train_ratio=0.8, output_path=None):
    """
    Export 3-behavior graph data from Django DB.

    Args:
        train_ratio: fraction for training set
        output_path: where to save .pt file
    """
    print("🔄 Fetching data from Django database...")

    # Get all active users and mangas
    users = User.objects.filter(is_active=True).order_by('id')
    mangas = Manga.objects.filter(is_active=True).order_by('id')

    user_id_map = {u.id: idx for idx, u in enumerate(users)}
    manga_id_map = {m.id: idx for idx, m in enumerate(mangas)}

    num_users = len(user_id_map)
    num_items = len(manga_id_map)

    print(f"✅ Users: {num_users}, Mangas: {num_items}")

    # Fetch behavior logs
    click_logs = UserBehaviorLog.objects.filter(
        event_type='CLICK',
        user__is_active=True,
        manga__is_active=True
    ).values_list('user_id', 'manga_id', 'created_at')

    cart_logs = UserBehaviorLog.objects.filter(
        event_type='ADD_CART',
        user__is_active=True,
        manga__is_active=True
    ).values_list('user_id', 'manga_id', 'created_at')

    rent_logs = UserBehaviorLog.objects.filter(
        event_type='RENT',
        user__is_active=True,
        manga__is_active=True
    ).values_list('user_id', 'manga_id', 'created_at')

    print(f"📊 CLICK: {len(click_logs)}, ADD_CART: {len(cart_logs)}, RENT: {len(rent_logs)}")

    if len(click_logs) == 0 or len(rent_logs) == 0:
        print("⚠️  Warning: Not enough data for v2 model. Need at least CLICK and RENT behaviors.")
        print("    Falling back to empty graph (will fail to train).")

    # Build edges for each behavior
    def build_edges(logs):
        """Convert logs to edge list, sorted by timestamp."""
        edges = []
        for user_id, manga_id, created_at in logs:
            if user_id in user_id_map and manga_id in manga_id_map:
                u_idx = user_id_map[user_id]
                m_idx = manga_id_map[manga_id]
                edges.append((u_idx, m_idx, created_at))

        # Sort by timestamp
        edges.sort(key=lambda x: x[2])
        return [(u, m) for u, m, _ in edges]

    click_edges = build_edges(click_logs)
    cart_edges = build_edges(cart_logs)
    rent_edges = build_edges(rent_logs)

    # Train/test split (chronological)
    def split_edges(edges, ratio):
        split_idx = int(len(edges) * ratio)
        train = edges[:split_idx]
        test = edges[split_idx:]
        return train, test

    click_train, click_test = split_edges(click_edges, train_ratio)
    cart_train, cart_test = split_edges(cart_edges, train_ratio)
    rent_train, rent_test = split_edges(rent_edges, train_ratio)

    print(f"🔀 Train/Test split ({train_ratio:.0%}):")
    print(f"   CLICK: {len(click_train)} / {len(click_test)}")
    print(f"   CART:  {len(cart_train)} / {len(cart_test)}")
    print(f"   RENT:  {len(rent_train)} / {len(rent_test)}")

    # Convert to PyTorch tensors
    def to_edge_index(edges):
        if len(edges) == 0:
            return torch.empty((2, 0), dtype=torch.long)
        users, items = zip(*edges)
        # Add num_users offset to item indices (standard bipartite graph format)
        edge_index = torch.tensor([
            list(users) + [m + num_users for m in items],
            [m + num_users for m in items] + list(users)
        ], dtype=torch.long)
        return edge_index

    edge_index_click_train = to_edge_index(click_train)
    edge_index_click_test = to_edge_index(click_test)
    edge_index_cart_train = to_edge_index(cart_train)
    edge_index_cart_test = to_edge_index(cart_test)
    edge_index_rent_train = to_edge_index(rent_train)
    edge_index_rent_test = to_edge_index(rent_test)

    # Save to file
    if output_path is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        output_path = os.path.join(data_dir, 'mbcgcn_v2_graph_data.pt')

    data = {
        'edge_index_click_train': edge_index_click_train,
        'edge_index_click_test': edge_index_click_test,
        'edge_index_cart_train': edge_index_cart_train,
        'edge_index_cart_test': edge_index_cart_test,
        'edge_index_rent_train': edge_index_rent_train,
        'edge_index_rent_test': edge_index_rent_test,
        'num_users': num_users,
        'num_items': num_items,
        'user_id_map': user_id_map,
        'manga_id_map': manga_id_map,
    }

    torch.save(data, output_path)
    print(f"💾 Saved to: {output_path}")

    return data


if __name__ == '__main__':
    prepare_v2_data()
