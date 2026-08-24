"""
Fuzzy-matching sync utility for mbrs_id (MyAnimeList ID).
Matches manga titles against Anime.csv using both English and Japanese names.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Cache for Anime.csv data - loaded once per server startup
_anime_data_cache = None


def _load_anime_data():
    """Load and cache Anime.csv data on first use."""
    global _anime_data_cache

    if _anime_data_cache is not None:
        return _anime_data_cache

    try:
        import pandas as pd
        from thefuzz import process, fuzz
    except ImportError:
        logger.warning("pandas or thefuzz not installed - mbrs_id sync disabled")
        _anime_data_cache = False
        return False

    csv_path = os.path.join(os.path.dirname(__file__), 'ml_models', 'Anime.csv')
    if not os.path.exists(csv_path):
        logger.warning(f"Anime.csv not found at {csv_path} - mbrs_id sync disabled")
        _anime_data_cache = False
        return False

    try:
        df = pd.read_csv(csv_path)
        mal = df[df['source'] == 'Manga'].copy()

        # Prepare both English and Japanese titles for matching
        mal['title_en'] = mal['title_english'].fillna('')
        mal['title_ja'] = mal['name'].fillna('')

        _anime_data_cache = {
            'df': mal,
            'titles_en': mal['title_en'].tolist(),
            'titles_ja': mal['title_ja'].tolist(),
            'id_map_en': dict(zip(mal['title_en'], mal['anime_id'])),
            'id_map_ja': dict(zip(mal['title_ja'], mal['anime_id'])),
            'fuzz': fuzz,
            'process': process,
        }
        logger.info(f"Loaded {len(mal)} manga entries from Anime.csv")
        return _anime_data_cache

    except Exception as e:
        logger.error(f"Failed to load Anime.csv: {e}")
        _anime_data_cache = False
        return False


def _clean_title(title):
    """Remove noise words from manga title for better matching."""
    noise = ['vol', 'vol.', 'v.', 'series', '19115']
    cleaned = title.lower()
    for word in noise:
        cleaned = cleaned.split(word)[0]
    return cleaned.strip()


def sync_mbrs_id_for_manga(manga):
    """
    Fuzzy-match manga title against Anime.csv and set mbrs_id.
    Checks both English and Japanese titles, picks the best match.

    Returns True if synced successfully, False otherwise.
    """
    data = _load_anime_data()
    if not data:
        return False

    query = _clean_title(manga.title)
    fuzz = data['fuzz']
    process = data['process']

    # Match against English titles
    result_en = process.extractOne(
        query,
        data['titles_en'],
        scorer=fuzz.token_sort_ratio
    )

    # Match against Japanese titles
    result_ja = process.extractOne(
        query,
        data['titles_ja'],
        scorer=fuzz.token_sort_ratio
    )

    # Pick the best match from both
    best_match = None
    best_score = 0
    best_title = None

    if result_en and result_en[1] > best_score:
        best_score = result_en[1]
        best_match = data['id_map_en'][result_en[0]]
        best_title = result_en[0]

    if result_ja and result_ja[1] > best_score:
        best_score = result_ja[1]
        best_match = data['id_map_ja'][result_ja[0]]
        best_title = result_ja[0]

    # Only sync if confidence is high enough
    if best_score > 80 and best_match:
        manga.mbrs_id = best_match
        manga.save(update_fields=['mbrs_id'])
        logger.info(f"[Score: {best_score}] '{manga.title}' -> {best_title} (ID: {best_match})")
        return True
    else:
        logger.debug(f"[Score: {best_score}] '{manga.title}' -> No confident match")
        return False
