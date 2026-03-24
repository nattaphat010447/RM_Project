import os
import django
import pandas as pd
from thefuzz import process, fuzz

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.models import Manga

def clean_title(title):
    noise_words = ['เล่ม', 'vol.', 'vol', '19115', 'v.', 'ตอนที่', 'series']
    cleaned = title.lower()
    for word in noise_words:
        cleaned = cleaned.split(word)[0]
    return cleaned.strip()

def run_sync():
    csv_path = os.path.join('rentals', 'ml_models', 'Anime.csv')
    
    if not os.path.exists(csv_path):
        print(f"ไม่พบไฟล์ {csv_path}")
        return

    df_anime = pd.read_csv(csv_path)
    mal_mangas = df_anime[df_anime['source'] == 'Manga'].copy()
    mal_mangas['lookup_name'] = mal_mangas['title_english'].fillna(mal_mangas['name'])
    
    mal_titles = mal_mangas['lookup_name'].tolist()
    title_to_id = dict(zip(mal_mangas['lookup_name'], mal_mangas['anime_id']))
    
    success_count = 0
    for manga in Manga.objects.all():
        search_query = clean_title(manga.title)
        
        best_match, score = process.extractOne(
            search_query, 
            mal_titles, 
            scorer=fuzz.token_sort_ratio
        )

        if score > 80:
            manga.mbrs_id = title_to_id[best_match]
            manga.save()
            print(f"[Score: {score}] '{manga.title}' -> {best_match} (ID: {manga.mbrs_id})")
            success_count += 1
        else:
            print(f"[Score: {score}] '{manga.title}' -> Not sure (Best Match: {best_match})")

if __name__ == "__main__":
    run_sync()