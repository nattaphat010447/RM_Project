"""
Prepare training data for MB-CGCN v2 (3 behaviors).

Two data sources — pick one via --source:

  db   (default) — reads from Django database (UserBehaviorLog model)
  csv  <path>    — reads from a CSV file with columns:
                     user_id, manga_id, event_type, timestamp
                   event_type values: CLICK, ADD_CART, RENT

Output: ml_model/data/mbcgcn_v2_graph_data.pt
  Keys: edge_index_{click,cart,rent}_{train,test}
        num_users, num_items, user_id_map, manga_id_map

Usage:
    # from database
    python prepare_data_v2.py

    # from CSV
    python prepare_data_v2.py --source csv --csv-path /path/to/logs.csv
"""
import os
import sys
import argparse
import torch
import pandas as pd

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ML_MODEL_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(ML_MODEL_DIR)


# ── Shared helpers ────────────────────────────────────────────────────────────

def to_edge_index(edges, num_users):
    """
    Convert list of (user_idx, item_idx) pairs to a bidirectional bipartite
    edge_index tensor [2, 2*E].  Item nodes are offset by num_users.
    """
    if not edges:
        return torch.empty((2, 0), dtype=torch.long)
    users, items = zip(*edges)
    items_off = [m + num_users for m in items]
    return torch.tensor(
        [list(users) + items_off, items_off + list(users)],
        dtype=torch.long
    )


def split_edges(edges, ratio):
    n = int(len(edges) * ratio)
    return edges[:n], edges[n:]


def build_and_save(click_edges, cart_edges, rent_edges,
                   num_users, num_items, user_id_map, manga_id_map,
                   train_ratio, output_path):
    c_tr, c_te   = split_edges(click_edges, train_ratio)
    ca_tr, ca_te = split_edges(cart_edges,  train_ratio)
    r_tr, r_te   = split_edges(rent_edges,  train_ratio)

    print(f"Train/test split ({train_ratio:.0%}):")
    print(f"  CLICK : {len(c_tr)} / {len(c_te)}")
    print(f"  CART  : {len(ca_tr)} / {len(ca_te)}")
    print(f"  RENT  : {len(r_tr)} / {len(r_te)}")

    if len(r_tr) < 10:
        print("WARNING: fewer than 10 RENT train interactions — model will not converge.")

    data = {
        'edge_index_click_train': to_edge_index(c_tr,  num_users),
        'edge_index_click_test':  to_edge_index(c_te,  num_users),
        'edge_index_cart_train':  to_edge_index(ca_tr, num_users),
        'edge_index_cart_test':   to_edge_index(ca_te, num_users),
        'edge_index_rent_train':  to_edge_index(r_tr,  num_users),
        'edge_index_rent_test':   to_edge_index(r_te,  num_users),
        'num_users':   num_users,
        'num_items':   num_items,
        'user_id_map': user_id_map,
        'manga_id_map': manga_id_map,
    }
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torch.save(data, output_path)
    print(f"Saved to: {output_path}")
    return data


# ── CSV source ────────────────────────────────────────────────────────────────

def prepare_from_csv(csv_path, train_ratio=0.8, output_path=None):
    """
    Load logs from a CSV file.

    Required columns: user_id, manga_id, event_type, timestamp
    event_type values: CLICK, ADD_CART, RENT
    """
    print(f"Loading logs from CSV: {csv_path}")
    df = pd.read_csv(csv_path, parse_dates=['timestamp'])

    required = {'user_id', 'manga_id', 'event_type', 'timestamp'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing columns: {missing}")

    df = df.sort_values('timestamp').reset_index(drop=True)

    # Remap raw IDs to contiguous 0-based indices
    users  = sorted(df['user_id'].unique())
    mangas = sorted(df['manga_id'].unique())
    user_id_map  = {uid: idx for idx, uid in enumerate(users)}
    manga_id_map = {mid: idx for idx, mid in enumerate(mangas)}
    num_users = len(user_id_map)
    num_items = len(manga_id_map)

    print(f"Users: {num_users}, Unique mangas: {num_items}")

    def extract(event_type):
        sub = df[df['event_type'] == event_type].sort_values('timestamp')
        return [(user_id_map[r.user_id], manga_id_map[r.manga_id])
                for r in sub.itertuples()]

    click_edges = extract('CLICK')
    cart_edges  = extract('ADD_CART')
    rent_edges  = extract('RENT')

    print(f"CLICK: {len(click_edges)}, ADD_CART: {len(cart_edges)}, RENT: {len(rent_edges)}")

    if output_path is None:
        data_dir    = os.path.join(ML_MODEL_DIR, 'data')
        output_path = os.path.join(data_dir, 'mbcgcn_v2_graph_data.pt')

    return build_and_save(
        click_edges, cart_edges, rent_edges,
        num_users, num_items, user_id_map, manga_id_map,
        train_ratio, output_path
    )


# ── Django DB source ──────────────────────────────────────────────────────────

def prepare_from_db(train_ratio=0.8, output_path=None):
    """Load logs from Django UserBehaviorLog model."""
    backend_path = os.path.join(PROJECT_ROOT, 'backend')
    sys.path.insert(0, backend_path)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

    import django
    django.setup()
    from rentals.models import UserBehaviorLog, User, Manga

    print("Fetching data from Django database...")

    users  = User.objects.filter(is_active=True).order_by('id')
    mangas = Manga.objects.filter(is_active=True).order_by('id')

    user_id_map  = {u.id: idx for idx, u in enumerate(users)}
    manga_id_map = {m.id: idx for idx, m in enumerate(mangas)}
    num_users = len(user_id_map)
    num_items = len(manga_id_map)

    print(f"Users: {num_users}, Mangas: {num_items}")

    def fetch(event_type):
        logs = (UserBehaviorLog.objects
                .filter(event_type=event_type,
                        user__is_active=True,
                        manga__is_active=True)
                .order_by('created_at')
                .values_list('user_id', 'manga_id'))
        return [(user_id_map[u], manga_id_map[m])
                for u, m in logs
                if u in user_id_map and m in manga_id_map]

    click_edges = fetch('CLICK')
    cart_edges  = fetch('ADD_CART')
    rent_edges  = fetch('RENT')

    print(f"CLICK: {len(click_edges)}, ADD_CART: {len(cart_edges)}, RENT: {len(rent_edges)}")

    if output_path is None:
        data_dir    = os.path.join(ML_MODEL_DIR, 'data')
        output_path = os.path.join(data_dir, 'mbcgcn_v2_graph_data.pt')

    return build_and_save(
        click_edges, cart_edges, rent_edges,
        num_users, num_items, user_id_map, manga_id_map,
        train_ratio, output_path
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', choices=['db', 'csv'], default='db',
                        help='Data source: Django DB (db) or CSV file (csv)')
    parser.add_argument('--csv-path', default=None,
                        help='Path to CSV log file (required when --source csv)')
    parser.add_argument('--train-ratio', type=float, default=0.8)
    parser.add_argument('--output-path', default=None)
    args = parser.parse_args()

    if args.source == 'csv':
        if not args.csv_path:
            parser.error('--csv-path is required when --source csv')
        prepare_from_csv(
            csv_path=args.csv_path,
            train_ratio=args.train_ratio,
            output_path=args.output_path,
        )
    else:
        prepare_from_db(
            train_ratio=args.train_ratio,
            output_path=args.output_path,
        )
