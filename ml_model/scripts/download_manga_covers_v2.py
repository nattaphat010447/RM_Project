"""
Scrape manga cover images from MyAnimeList using Jikan manga endpoint
Downloads cover images for the top 100 manga
"""

import os
import sys
import time
import requests
import pandas as pd
from pathlib import Path

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers')
DELAY_BETWEEN_REQUESTS = 2.0  # seconds (be respectful to MAL servers)
MAX_RETRIES = 3  # Retry up to 3 times for failed requests
RETRY_DELAY = 20  # seconds between retries

def get_top_manga(limit=100):
    """
    Fetch top manga list from Jikan API
    """
    print(f"📂 Fetching top {limit} manga from MyAnimeList...")

    all_manga = []
    page = 1
    per_page = 25  # Jikan API returns 25 per page

    while len(all_manga) < limit:
        try:
            url = f"https://api.jikan.moe/v4/top/manga?page={page}&limit={per_page}"
            response = requests.get(url, timeout=15)

            if response.status_code == 200:
                data = response.json()
                manga_list = data['data']

                if not manga_list:
                    break

                all_manga.extend(manga_list)
                print(f"  Fetched page {page}: {len(manga_list)} manga")

                page += 1
                time.sleep(2)  # Delay between pages

            elif response.status_code == 429:
                print(f"  ⚠️ Rate limited - waiting 60 seconds...")
                time.sleep(60)

            else:
                print(f"  ❌ Error fetching page {page}: {response.status_code}")
                break

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            break

    # Limit to requested amount
    all_manga = all_manga[:limit]

    print(f"✅ Loaded {len(all_manga)} manga")
    return all_manga

def download_manga_cover(manga_id, title, image_url, output_dir, retry_count=0):
    """
    Download manga cover image

    Args:
        manga_id: MAL manga_id
        title: Manga title (for filename)
        image_url: Direct image URL
        output_dir: Directory to save images
        retry_count: Current retry attempt

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Download image
        img_response = requests.get(image_url, timeout=15)

        if img_response.status_code == 200:
            # Create safe filename
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            safe_title = safe_title.replace(' ', '_')[:50]  # Limit length

            filename = f"manga_{manga_id}_{safe_title}.jpg"
            filepath = os.path.join(output_dir, filename)

            # Save image
            with open(filepath, 'wb') as f:
                f.write(img_response.content)

            print(f"  ✅ [{manga_id}] {title}")
            return True

        elif img_response.status_code in [502, 503, 504]:
            # Server errors - retry
            if retry_count < MAX_RETRIES:
                print(f"  🔄 [{manga_id}] {title} - Server error {img_response.status_code}, retrying ({retry_count + 1}/{MAX_RETRIES})...")
                time.sleep(RETRY_DELAY)
                return download_manga_cover(manga_id, title, image_url, output_dir, retry_count + 1)
            else:
                print(f"  ❌ [{manga_id}] {title} - Failed after {MAX_RETRIES} retries")
                return False

        else:
            print(f"  ❌ [{manga_id}] {title} - Image download error {img_response.status_code}")
            return False

    except requests.Timeout:
        if retry_count < MAX_RETRIES:
            print(f"  🔄 [{manga_id}] {title} - Timeout, retrying ({retry_count + 1}/{MAX_RETRIES})...")
            time.sleep(RETRY_DELAY)
            return download_manga_cover(manga_id, title, image_url, output_dir, retry_count + 1)
        else:
            print(f"  ❌ [{manga_id}] {title} - Timeout after {MAX_RETRIES} retries")
            return False

    except Exception as e:
        print(f"  ❌ [{manga_id}] {title} - Error: {str(e)}")
        return False

def main():
    print("="*60)
    print("MyAnimeList Manga Cover Downloader (Manga Endpoint)")
    print("="*60)

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📁 Output directory: {OUTPUT_DIR}")

    # Fetch top manga
    top_manga = get_top_manga(limit=100)

    print(f"\n🚀 Starting download of {len(top_manga)} covers...")
    print(f"⏱️ Delay between requests: {DELAY_BETWEEN_REQUESTS}s")
    print()

    success_count = 0
    failed_count = 0
    skipped_count = 0

    for manga in top_manga:
        manga_id = manga['mal_id']
        title = manga.get('title_english') or manga.get('title')
        image_url = manga['images']['jpg']['large_image_url']

        # Check if already downloaded
        existing_files = list(Path(OUTPUT_DIR).glob(f"manga_{manga_id}_*.jpg"))
        if existing_files:
            print(f"  ⏭️ [{manga_id}] {title} - Already exists, skipping")
            skipped_count += 1
            continue

        # Download
        if download_manga_cover(manga_id, title, image_url, OUTPUT_DIR):
            success_count += 1
        else:
            failed_count += 1

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "="*60)
    print("✨ Download completed!")
    print(f"  - Success: {success_count}")
    print(f"  - Failed: {failed_count}")
    print(f"  - Skipped: {skipped_count}")
    print(f"  - Total: {len(top_manga)}")
    print("="*60)

if __name__ == "__main__":
    main()
