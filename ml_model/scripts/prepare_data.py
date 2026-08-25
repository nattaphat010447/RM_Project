"""
Data preparation script for MB-CGCN training
Prepares graph data from Anime.csv and User-AnimeReview.csv
"""

import pandas as pd
import torch
import numpy as np
from sklearn.model_selection import train_test_split
import os


def prepare_graph_data(
    anime_csv_path,
    review_csv_path,
    output_path='data/mbcgcn_graph_data.pt',
    test_size=0.20,
    random_state=42
):
    """
    Prepare graph data from CSV files

    Args:
        anime_csv_path: Path to Anime.csv
        review_csv_path: Path to User-AnimeReview.csv
        output_path: Output path for processed data
        test_size: Test split ratio (default: 0.20)
        random_state: Random seed (default: 42)

    Returns:
        dict: Contains edge indices, mappings, and metadata
    """
    print("Step 1: Loading and Filtering Data...")
    df_anime = pd.read_csv(anime_csv_path)
    df_review = pd.read_csv(review_csv_path)

    # Filter manga only (exclude source '010447')
    df_manga = df_anime[df_anime['source'] != '010447'].copy()
    valid_manga_ids = df_manga['anime_id'].unique()
    df_interact = df_review[df_review['anime_id'].isin(valid_manga_ids)].copy()

    print("Step 2: ID Mapping...")
    user_mapping = {uid: i for i, uid in enumerate(df_interact['user_id'].unique())}
    item_mapping = {iid: i for i, iid in enumerate(df_interact['anime_id'].unique())}

    df_interact['user_idx'] = df_interact['user_id'].map(user_mapping)
    df_interact['item_idx'] = df_interact['anime_id'].map(item_mapping)

    num_users = len(user_mapping)
    num_items = len(item_mapping)

    print(f"Total Unique Users: {num_users}")
    print(f"Total Unique Mangas: {num_items}")

    print("Step 3: Extracting Behaviors & Train/Test Split...")

    def to_bipartite_edge_index(user_idx_values, item_idx_values, num_users):
        """
        Build an undirected bipartite edge_index for a GCN that operates on
        torch.cat([user_emb, item_emb]) (item nodes live at [num_users, num_users+num_items)).
        Includes both user->item and item->user edges so message passing
        updates both sides of the graph.
        """
        users = user_idx_values.tolist() if hasattr(user_idx_values, 'tolist') else list(user_idx_values)
        items = [x + num_users for x in (item_idx_values.tolist() if hasattr(item_idx_values, 'tolist') else list(item_idx_values))]
        src = users + items
        dst = items + users
        return torch.tensor([src, dst], dtype=torch.long)

    # CART behavior: "Plan to Watch"
    df_cart = df_interact[df_interact['status'] == 'Plan to Watch']
    edge_index_cart = to_bipartite_edge_index(
        df_cart['user_idx'].values, df_cart['item_idx'].values, num_users
    )

    # RENT behavior: "Watching" + "Completed"
    df_rent = df_interact[df_interact['status'].isin(['Watching', 'Completed'])]
    df_rent_train, df_rent_test = train_test_split(
        df_rent,
        test_size=test_size,
        random_state=random_state
    )

    edge_index_rent_train = to_bipartite_edge_index(
        df_rent_train['user_idx'].values, df_rent_train['item_idx'].values, num_users
    )
    edge_index_rent_test = to_bipartite_edge_index(
        df_rent_test['user_idx'].values, df_rent_test['item_idx'].values, num_users
    )

    print("\nGraph Construction Complete! Shape of Edge Tensors:")
    print(f"Cart Edges:  {edge_index_cart.shape}")
    print(f"Rent Edges (Train): {edge_index_rent_train.shape}")
    print(f"Rent Edges (Test):  {edge_index_rent_test.shape}")

    # Save to file
    data = {
        'edge_index_cart': edge_index_cart,
        'edge_index_rent_train': edge_index_rent_train,
        'edge_index_rent_test': edge_index_rent_test,
        'num_users': num_users,
        'num_items': num_items,
        'user_mapping': user_mapping,
        'item_mapping': item_mapping
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torch.save(data, output_path)
    print(f"Saved graph data to '{output_path}'")

    return data


if __name__ == "__main__":
    # Example usage
    prepare_graph_data(
        anime_csv_path='data/Anime.csv',
        review_csv_path='data/User-AnimeReview.csv',
        output_path='data/mbcgcn_graph_data.pt'
    )
