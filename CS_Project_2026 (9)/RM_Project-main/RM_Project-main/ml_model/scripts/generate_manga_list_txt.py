"""
Generate manga list in text format from metadata
Output format matches seed.py style
"""

import os
import json
from pathlib import Path

# Configuration
METADATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'covers', 'metadata')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'manga_list.txt')

def generate_manga_list():
    """Generate manga list text file"""
    print("="*60)
    print("Generate Manga List Text File")
    print("="*60)

    # Find all metadata files
    metadata_files = list(Path(METADATA_DIR).glob('*.json'))
    print(f"\n📂 Found {len(metadata_files)} metadata files")

    if not metadata_files:
        print("❌ No metadata files found!")
        return

    # Load all manga data
    manga_list = []

    for filepath in sorted(metadata_files):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Extract data
        manga_entry = {
            'title': data['title'],
            'author': data['author'],
            'genre': data['genres'],
            'cover_image_url': f"/images/mangas/{data['cover_filename']}",
            'price': round(10.0 + (data.get('average_score', 70) / 10.0), 2)
        }

        manga_list.append(manga_entry)

    print(f"✅ Loaded {len(manga_list)} manga")

    # Generate text output
    print(f"\n📝 Writing to {OUTPUT_FILE}...")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('mangas = [\n')

        for i, manga in enumerate(manga_list):
            # Write manga entry
            f.write(f'    {{"title": "{manga["title"]}", ')
            f.write(f'"author": "{manga["author"]}", ')
            f.write(f'"genre": "{manga["genre"]}", ')
            f.write(f'"cover_image_url": "{manga["cover_image_url"]}", ')
            f.write(f'"price": {manga["price"]}}}')

            # Add comma except for last item
            if i < len(manga_list) - 1:
                f.write(',\n')
            else:
                f.write('\n')

        f.write(']\n')

    print(f"✅ Generated manga list with {len(manga_list)} entries")
    print(f"📁 Output: {OUTPUT_FILE}")

    # Show first 5 as preview
    print("\n📋 Preview (first 5):")
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()[:7]
        for line in lines:
            print(line.rstrip())

    print("\n" + "="*60)
    print("✨ Completed!")
    print("="*60)

if __name__ == "__main__":
    generate_manga_list()
