"""
Scrape manga cover images from MyAnimeList for top-rated manga
Downloads cover images for the top 100 manga from the dataset
"""

import os
import sys
import time
import requests
import pandas as pd
from pathlib import Path

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers')
ANIME_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'Anime.csv')
DELAY_BETWEEN_REQUESTS = 2.0  # seconds (be respectful to MAL servers)
MAX_RETRIES = 3  # Retry up to 3 times for failed requests
RETRY_DELAY = 20  # seconds between retries

def load_top_manga(limit=100):
    """Load top-rated manga from Anime.csv"""
    print(f"📂 Loading manga data from: {ANIME_CSV}")

    if not os.path.exists(ANIME_CSV):
        print(f"❌ Error: {ANIME_CSV} not found!")
        sys.exit(1)

    df = pd.read_csv(ANIME_CSV)

    # Filter manga only
    manga_df = df[df['source'] == 'Manga'].copy()

    # Sort by rating and popularity
    manga_df = manga_df.sort_values(by=['rating', 'popularity'], ascending=[False, True])

    # Get top N
    top_manga = manga_df.head(limit)

    print(f"✅ Loaded {len(top_manga)} top manga")
    return top_manga

def download_cover_image(anime_id, title, output_dir, retry_count=0):
    """
    Download cover image for a manga from MyAnimeList

    Args:
        anime_id: MAL anime_id
        title: Manga title (for filename)
        output_dir: Directory to save images
        retry_count: Current retry attempt

    Returns:
        bool: True if successful, False otherwise
    """
    # MAL API endpoint (using Jikan API - unofficial MAL API)
    url = f"https://api.jikan.moe/v4/anime/{anime_id}"

    try:
        response = requests.get(url, timeout=15)

        if response.status_code == 200:
            data = response.json()

            # Get image URL
            image_url = data['data']['images']['jpg']['large_image_url']

            # Download image
            img_response = requests.get(image_url, timeout=15)

            if img_response.status_code == 200:
                # Create safe filename
                safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                safe_title = safe_title.replace(' ', '_')[:50]  # Limit length

                filename = f"{anime_id}_{safe_title}.jpg"
                filepath = os.path.join(output_dir, filename)

                # Save image
                with open(filepath, 'wb') as f:
                    f.write(img_response.content)

                print(f"  ✅ [{anime_id}] {title}")
                return True
            else:
                print(f"  ❌ [{anime_id}] {title} - Failed to download image")
                return False

        elif response.status_code == 429:
            print(f"  ⚠️ Rate limited - waiting 60 seconds...")
            time.sleep(60)
            return False

        elif response.status_code in [502, 503, 504]:
            # Server errors - retry
            if retry_count < MAX_RETRIES:
                print(f"  🔄 [{anime_id}] {title} - Server error {response.status_code}, retrying ({retry_count + 1}/{MAX_RETRIES})...")
                time.sleep(RETRY_DELAY)
                return download_cover_image(anime_id, title, output_dir, retry_count + 1)
            else:
                print(f"  ❌ [{anime_id}] {title} - Failed after {MAX_RETRIES} retries (error {response.status_code})")
                return False

        else:
            print(f"  ❌ [{anime_id}] {title} - API error {response.status_code}")
            return False

    except requests.Timeout:
        if retry_count < MAX_RETRIES:
            print(f"  🔄 [{anime_id}] {title} - Timeout, retrying ({retry_count + 1}/{MAX_RETRIES})...")
            time.sleep(RETRY_DELAY)
            return download_cover_image(anime_id, title, output_dir, retry_count + 1)
        else:
            print(f"  ❌ [{anime_id}] {title} - Timeout after {MAX_RETRIES} retries")
            return False

    except Exception as e:
        print(f"  ❌ [{anime_id}] {title} - Error: {str(e)}")
        return False

def main():
    print("="*60)
    print("MyAnimeList Manga Cover Downloader")
    print("="*60)

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📁 Output directory: {OUTPUT_DIR}")

    # Load top manga
    top_manga = load_top_manga(limit=100)

    print(f"\n🚀 Starting download of {len(top_manga)} covers...")
    print(f"⏱️ Delay between requests: {DELAY_BETWEEN_REQUESTS}s")
    print()

    success_count = 0
    failed_count = 0

    for idx, row in top_manga.iterrows():
        anime_id = row['anime_id']
        title = row['title_english'] if pd.notna(row['title_english']) else row['name']

        # Check if already downloaded
        existing_files = list(Path(OUTPUT_DIR).glob(f"{anime_id}_*.jpg"))
        if existing_files:
            print(f"  ⏭️ [{anime_id}] {title} - Already exists, skipping")
            success_count += 1
            continue

        # Download
        if download_cover_image(anime_id, title, OUTPUT_DIR):
            success_count += 1
        else:
            failed_count += 1

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "="*60)
    print("✨ Download completed!")
    print(f"  - Success: {success_count}")
    print(f"  - Failed: {failed_count}")
    print(f"  - Total: {len(top_manga)}")
    print("="*60)

if __name__ == "__main__":
    main()
