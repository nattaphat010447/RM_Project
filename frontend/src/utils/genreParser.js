/**
 * Parse genre string into array of individual genres
 * Handles multiple separators: /, ,, &, ;
 * Normalizes case and removes duplicates
 */
export const parseGenres = (genreString) => {
  if (!genreString || typeof genreString !== 'string') {
    return [];
  }

  // Split by multiple separators: /, ,, &, ;
  const genres = genreString
    .split(/[\/,&;]/)
    .map(g => g.trim())
    .filter(g => g.length > 0)
    .map(g => {
      // Normalize: capitalize first letter of each word
      return g.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    });

  // Remove duplicates
  return [...new Set(genres)];
};

/**
 * Get all unique genres from array of manga objects
 */
export const getAllGenres = (mangas) => {
  const genresSet = new Set();

  mangas.forEach(manga => {
    if (manga.genre) {
      const genres = parseGenres(manga.genre);
      genres.forEach(g => genresSet.add(g));
    }
  });

  return Array.from(genresSet).sort();
};

/**
 * Check if manga has specific genre
 */
export const mangaHasGenre = (manga, targetGenre) => {
  if (!manga.genre || !targetGenre) return false;

  const mangaGenres = parseGenres(manga.genre);
  const normalizedTarget = targetGenre.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return mangaGenres.includes(normalizedTarget);
};
