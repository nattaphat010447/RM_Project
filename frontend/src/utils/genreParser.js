/**
 * Genre helpers. Genre strings in the data use "/", ",", "&" or ";" as
 * separators, e.g. "Action, Adventure, Sci-Fi" or "Comedy/Action".
 */

const MINOR_WORDS = new Set(['of', 'and', 'the', 'in', 'a', 'an', 'to', 'for']);

const capitalise = (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();

/**
 * Title-case one genre: "sci-fi" -> "Sci-Fi", "SLICE OF LIFE" -> "Slice of Life".
 */
export const normaliseGenre = (genre) =>
  genre
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && MINOR_WORDS.has(lower)) return lower;
      return word.split('-').map(capitalise).join('-');
    })
    .join(' ');

/**
 * Parse a genre string into an array of individual, normalised genres
 * without duplicates.
 */
export const parseGenres = (genreString) => {
  if (!genreString || typeof genreString !== 'string') {
    return [];
  }

  const genres = genreString
    .split(/[/,&;]/)
    .map(g => g.trim())
    .filter(g => g.length > 0)
    .map(normaliseGenre);

  return [...new Set(genres)];
};

/**
 * Get all unique genres from an array of manga objects, sorted A-Z.
 */
export const getAllGenres = (mangas) => {
  const genresSet = new Set();
  mangas.forEach(manga => {
    parseGenres(manga.genre).forEach(g => genresSet.add(g));
  });
  return Array.from(genresSet).sort((a, b) => a.localeCompare(b));
};

/**
 * Check whether a manga has a specific genre (case-insensitive).
 */
export const mangaHasGenre = (manga, targetGenre) => {
  if (!manga || !manga.genre || !targetGenre) return false;
  return parseGenres(manga.genre).includes(normaliseGenre(targetGenre));
};
