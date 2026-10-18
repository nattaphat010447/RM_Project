"""
Script to copy existing model files from backend to ml_model folder
Run this after setting up ml_model/ structure
"""

import os
import shutil

def copy_model_files():
    # Paths
    backend_ml = 'backend/rentals/ml_models'
    ml_model_data = 'ml_model/data'
    ml_model_weights = 'ml_model/weights'

    # Create directories if they don't exist
    os.makedirs(ml_model_data, exist_ok=True)
    os.makedirs(ml_model_weights, exist_ok=True)

    files_to_copy = [
        # (source, destination)
        (f'{backend_ml}/Anime.csv', f'{ml_model_data}/Anime.csv'),
        (f'{backend_ml}/mbcgcn_graph_data.pt', f'{ml_model_data}/mbcgcn_graph_data.pt'),
        (f'{backend_ml}/mbcgcn_model_weights.pth', f'{ml_model_weights}/mbcgcn_manga_weights.pth'),
    ]

    # Optional: User-AnimeReview.csv if exists
    user_review_src = f'{backend_ml}/User-AnimeReview.csv'
    if os.path.exists(user_review_src):
        files_to_copy.append((user_review_src, f'{ml_model_data}/User-AnimeReview.csv'))

    print("Copying model files from backend/rentals/ml_models/ to ml_model/...")
    print("-" * 60)

    copied = 0
    skipped = 0

    for src, dst in files_to_copy:
        if os.path.exists(src):
            shutil.copy2(src, dst)
            file_size = os.path.getsize(dst) / (1024 * 1024)  # MB
            print(f"✓ Copied: {src} -> {dst} ({file_size:.2f} MB)")
            copied += 1
        else:
            print(f"✗ Skipped: {src} (file not found)")
            skipped += 1

    print("-" * 60)
    print(f"Summary: {copied} copied, {skipped} skipped")

    if copied > 0:
        print("\n✅ Model files ready in ml_model/ folder!")
        print("\nNext steps:")
        print("1. Backend will now load from ml_model/ automatically")
        print("2. You can re-train models using: python ml_model/scripts/train.py")
        print("3. Old files in backend/rentals/ml_models/ can be kept as backup")


if __name__ == "__main__":
    copy_model_files()
