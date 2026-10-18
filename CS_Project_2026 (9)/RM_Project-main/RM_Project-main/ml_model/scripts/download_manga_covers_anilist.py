"""
Download manga cover images using AniList GraphQL API
AniList has better rate limits and more stable than Jikan
"""

import os
import sys
import time
import requests
from pathlib import Path

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers')
DELAY_BETWEEN_REQUESTS = 1.5  # seconds
MAX_RETRIES = 3
RETRY_DELAY = 10

ANILIST_API_URL = "https://graphql.anilist.co"

def fetch_top_manga(limit=100):
    """
    Fetch top manga from AniList using GraphQL
    """
    print(f"📂 Fetching top {limit} manga from AniList...")

    query = """
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        media(type: MANGA, sort: [SCORE_DESC, POPULARITY_DESC], format_in: [MANGA, ONE_SHOT]) {
          id
          title {
            romaji
            english
          }
          coverImage {
            extraLarge
            large
          }
          averageScore
          popularity
        }
      }
    }
    """

    all_manga = []
    page = 1
    per_page = 50

    while len(all_manga) < limit:
        try:
            variables = {
                'page': page,
                'perPage': per_page
            }

            response = requests.post(
                ANILIST_API_URL,
                json={'query': query, 'variables': variables},
                timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                manga_list = data['data']['Page']['media']

                if not manga_list:
                    break

                all_manga.extend(manga_list)
                print(f"  ✅ Fetched page {page}: {len(manga_list)} manga (total: {len(all_manga)})")

                has_next = data['data']['Page']['pageInfo']['hasNextPage']
                if not has_next:
                    break

                page += 1
                time.sleep(1.5)  # AniList rate limit: ~90 requests per minute

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
        manga_id: AniList manga ID
        title: Manga title
        image_url: Direct image URL
        output_dir: Directory to save images
        retry_count: Current retry attempt

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        img_response = requests.get(image_url, timeout=15)

        if img_response.status_code == 200:
            # Create safe filename
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            safe_title = safe_title.replace(' ', '_')[:50]

            filename = f"anilist_{manga_id}_{safe_title}.jpg"
            filepath = os.path.join(output_dir, filename)

            # Save image
            with open(filepath, 'wb') as f:
                f.write(img_response.content)

            print(f"  ✅ [{manga_id}] {title}")
            return True

        elif img_response.status_code in [502, 503, 504]:
            if retry_count < MAX_RETRIES:
                print(f"  🔄 [{manga_id}] {title} - Server error, retrying ({retry_count + 1}/{MAX_RETRIES})...")
                time.sleep(RETRY_DELAY)
                return download_manga_cover(manga_id, title, image_url, output_dir, retry_count + 1)
            else:
                print(f"  ❌ [{manga_id}] {title} - Failed after {MAX_RETRIES} retries")
                return False

        else:
            print(f"  ❌ [{manga_id}] {title} - Download error {img_response.status_code}")
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
    print("AniList Manga Cover Downloader")
    print("="*60)

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📁 Output directory: {OUTPUT_DIR}")

    # Fetch top manga
    top_manga = fetch_top_manga(limit=100)

    if not top_manga:
        print("\n❌ No manga fetched. Exiting.")
        return

    print(f"\n🚀 Starting download of {len(top_manga)} covers...")
    print(f"⏱️ Delay between requests: {DELAY_BETWEEN_REQUESTS}s")
    print()

    success_count = 0
    failed_count = 0
    skipped_count = 0

    for manga in top_manga:
        manga_id = manga['id']
        title = manga['title'].get('english') or manga['title'].get('romaji')
        image_url = manga['coverImage'].get('extraLarge') or manga['coverImage'].get('large')

        if not image_url:
            print(f"  ⚠️ [{manga_id}] {title} - No image URL")
            failed_count += 1
            continue

        # Check if already downloaded
        existing_files = list(Path(OUTPUT_DIR).glob(f"anilist_{manga_id}_*.jpg"))
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
