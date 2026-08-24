"""
Process AniList manga covers:
1. Rename cover files to match manga titles
2. Create metadata JSON files (title + description)
3. Generate seed script for database
"""

import os
import re
import json
import requests
import time
from pathlib import Path

# Configuration
COVERS_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers')
METADATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers', 'metadata')
SEED_OUTPUT = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'seed_manga_from_anilist.py')

ANILIST_API_URL = "https://graphql.anilist.co"

def fetch_manga_details(manga_ids):
    """
    Fetch detailed manga info from AniList for multiple IDs
    """
    query = """
    query ($ids: [Int]) {
      Page {
        media(id_in: $ids, type: MANGA) {
          id
          title {
            romaji
            english
          }
          description
          genres
          averageScore
          staff(perPage: 5, sort: RELEVANCE) {
            edges {
              node {
                name {
                  full
                }
              }
              role
            }
          }
        }
      }
    }
    """

    try:
        variables = {'ids': manga_ids}
        response = requests.post(
            ANILIST_API_URL,
            json={'query': query, 'variables': variables},
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            return data['data']['Page']['media']
        else:
            print(f"  ❌ Error fetching details: {response.status_code}")
            return []

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return []

def clean_html(text):
    """Remove HTML tags from description"""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub('<.*?>', '', text)
    # Remove extra whitespace
    clean = ' '.join(clean.split())
    return clean

def sanitize_filename(title):
    """Create safe filename from title"""
    # Remove invalid characters
    safe = re.sub(r'[<>:"/\\|?*]', '', title)
    # Replace spaces with underscores
    safe = safe.replace(' ', '_')
    # Limit length
    safe = safe[:100]
    return safe.lower()

def process_covers():
    """Process all downloaded covers"""
    print("="*60)
    print("AniList Manga Cover Processor")
    print("="*60)

    # Create metadata directory
    os.makedirs(METADATA_DIR, exist_ok=True)

    # Find all anilist cover files
    cover_files = list(Path(COVERS_DIR).glob('anilist_*.jpg'))
    print(f"\n📂 Found {len(cover_files)} cover files")

    if not cover_files:
        print("❌ No cover files found!")
        return

    # Extract manga IDs
    manga_ids = []
    file_map = {}  # id -> filepath

    for filepath in cover_files:
        filename = filepath.name
        match = re.match(r'anilist_(\d+)_', filename)
        if match:
            manga_id = int(match.group(1))
            manga_ids.append(manga_id)
            file_map[manga_id] = filepath

    print(f"📊 Extracted {len(manga_ids)} manga IDs")

    # Fetch manga details in batches (AniList allows ~50 per request)
    print("\n🔍 Fetching manga details from AniList...")
    all_manga_data = []
    batch_size = 50

    for i in range(0, len(manga_ids), batch_size):
        batch = manga_ids[i:i+batch_size]
        print(f"  Fetching batch {i//batch_size + 1} ({len(batch)} items)...")
        manga_data = fetch_manga_details(batch)
        all_manga_data.extend(manga_data)
        time.sleep(1.5)

    print(f"✅ Fetched details for {len(all_manga_data)} manga")

    # Process each manga
    print("\n🔨 Processing covers and metadata...")
    processed_data = []

    for manga in all_manga_data:
        manga_id = manga['id']
        title = manga['title'].get('english') or manga['title'].get('romaji')
        description = clean_html(manga.get('description', ''))
        genres = ', '.join(manga.get('genres', []))

        # Get author from staff
        author = "Unknown"
        for edge in manga.get('staff', {}).get('edges', []):
            if edge.get('role') in ['Story', 'Story & Art', 'Original Creator']:
                author = edge['node']['name']['full']
                break

        # Old and new filenames
        old_filepath = file_map.get(manga_id)
        if not old_filepath:
            continue

        safe_title = sanitize_filename(title)
        new_filename = f"{safe_title}.jpg"
        new_filepath = os.path.join(COVERS_DIR, new_filename)

        # Rename cover file
        if old_filepath.exists() and not os.path.exists(new_filepath):
            os.rename(old_filepath, new_filepath)
            print(f"  ✅ Renamed: {old_filepath.name} → {new_filename}")

        # Create metadata JSON
        metadata = {
            'anilist_id': manga_id,
            'title': title,
            'author': author,
            'genres': genres,
            'description': description,
            'cover_filename': new_filename,
            'average_score': manga.get('averageScore')
        }

        metadata_filename = f"{safe_title}.json"
        metadata_filepath = os.path.join(METADATA_DIR, metadata_filename)

        with open(metadata_filepath, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        # Add to processed data for seed script
        processed_data.append({
            'title': title,
            'author': author,
            'genre': genres,
            'description': description[:500] if description else "",  # Limit description length
            'cover_image_url': f'/images/mangas/{new_filename}',
            'mbrs_id': manga_id,
            'price': round(10.0 + (manga.get('averageScore', 70) / 10.0), 2)  # Price based on score
        })

    print(f"\n✅ Processed {len(processed_data)} manga")

    # Generate seed script
    print("\n📝 Generating seed script...")
    generate_seed_script(processed_data)

    print("\n" + "="*60)
    print("✨ Processing completed!")
    print(f"  - Covers renamed: {len(processed_data)}")
    print(f"  - Metadata files: {len(processed_data)}")
    print(f"  - Seed script: {SEED_OUTPUT}")
    print("="*60)

def generate_seed_script(manga_data):
    """Generate Django seed script"""

    script_content = '''"""
Seed database with manga from AniList
Auto-generated by process_anilist_covers.py
"""

from rentals.models import Manga, MangaCopy

def seed_anilist_manga():
    """Seed manga data from AniList"""

    print("Seeding manga from AniList...")

    mangas = '''

    # Add manga data
    script_content += json.dumps(manga_data, indent=4, ensure_ascii=False)

    script_content += '''

    created_count = 0
    skipped_count = 0

    for manga_data in mangas:
        # Check if manga already exists (by mbrs_id or title)
        if manga_data.get('mbrs_id'):
            existing = Manga.objects.filter(mbrs_id=manga_data['mbrs_id']).first()
        else:
            existing = Manga.objects.filter(title=manga_data['title']).first()

        if existing:
            print(f"  ⏭️  Skipped: {manga_data['title']} (already exists)")
            skipped_count += 1
            continue

        # Create manga
        manga = Manga.objects.create(
            title=manga_data['title'],
            author=manga_data['author'],
            genre=manga_data['genre'],
            description=manga_data.get('description', ''),
            cover_image_url=manga_data['cover_image_url'],
            rental_price_per_day=manga_data['price'],
            mbrs_id=manga_data.get('mbrs_id'),
            is_active=True
        )

        # Create 3 copies for each manga
        for i in range(3):
            MangaCopy.objects.create(
                manga=manga,
                serial_no=f"{manga.title[:3].upper()}-{manga.id:04d}-{i+1:02d}",
                status=MangaCopy.Status.AVAILABLE
            )

        print(f"  ✅ Created: {manga.title} (3 copies)")
        created_count += 1

    print(f"\\n✨ Seeding completed!")
    print(f"  - Created: {created_count} manga")
    print(f"  - Skipped: {skipped_count} manga")
    print(f"  - Total copies: {created_count * 3}")

if __name__ == "__main__":
    seed_anilist_manga()
'''

    # Write seed script
    with open(SEED_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(script_content)

    print(f"  ✅ Seed script created: {SEED_OUTPUT}")

if __name__ == "__main__":
    process_covers()
