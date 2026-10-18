import { parseGenres, getAllGenres, mangaHasGenre } from './genreParser';

describe('parseGenres', () => {
  test('should parse genres separated by slash', () => {
    const result = parseGenres('Action/Fantasy');
    expect(result).toEqual(['Action', 'Fantasy']);
  });

  test('should parse genres separated by comma', () => {
    const result = parseGenres('Comedy, Action');
    expect(result).toEqual(['Comedy', 'Action']);
  });

  test('should handle single genre', () => {
    const result = parseGenres('Action');
    expect(result).toEqual(['Action']);
  });

  test('should handle genres with spaces around separator', () => {
    const result = parseGenres('action / fantasy');
    expect(result).toEqual(['Action', 'Fantasy']);
  });

  test('should return empty array for empty string', () => {
    const result = parseGenres('');
    expect(result).toEqual([]);
  });

  test('should normalize case (capitalize first letter)', () => {
    const result = parseGenres('ACTION/fantasy/CoMeDy');
    expect(result).toEqual(['Action', 'Fantasy', 'Comedy']);
  });

  test('should remove duplicates', () => {
    const result = parseGenres('Action/Fantasy/Action');
    expect(result).toEqual(['Action', 'Fantasy']);
  });

  test('should handle multiple separators', () => {
    const result = parseGenres('Action/Comedy, Drama & Mystery');
    expect(result).toEqual(['Action', 'Comedy', 'Drama', 'Mystery']);
  });

  test('should handle semicolon separator', () => {
    const result = parseGenres('Action;Comedy;Drama');
    expect(result).toEqual(['Action', 'Comedy', 'Drama']);
  });

  test('should return empty array for null', () => {
    const result = parseGenres(null);
    expect(result).toEqual([]);
  });

  test('should return empty array for undefined', () => {
    const result = parseGenres(undefined);
    expect(result).toEqual([]);
  });
});

describe('getAllGenres', () => {
  test('should extract all unique genres from manga list', () => {
    const mangas = [
      { genre: 'Action/Fantasy' },
      { genre: 'Comedy, Action' },
      { genre: 'Drama' }
    ];
    const result = getAllGenres(mangas);
    expect(result).toEqual(['Action', 'Comedy', 'Drama', 'Fantasy']);
  });

  test('should handle empty manga list', () => {
    const result = getAllGenres([]);
    expect(result).toEqual([]);
  });

  test('should ignore manga without genre', () => {
    const mangas = [
      { genre: 'Action' },
      { title: 'No Genre' },
      { genre: 'Comedy' }
    ];
    const result = getAllGenres(mangas);
    expect(result).toEqual(['Action', 'Comedy']);
  });
});

describe('mangaHasGenre', () => {
  test('should return true when manga has the genre', () => {
    const manga = { genre: 'Action/Fantasy' };
    expect(mangaHasGenre(manga, 'Action')).toBe(true);
    expect(mangaHasGenre(manga, 'Fantasy')).toBe(true);
  });

  test('should return false when manga does not have the genre', () => {
    const manga = { genre: 'Action/Fantasy' };
    expect(mangaHasGenre(manga, 'Comedy')).toBe(false);
  });

  test('should be case-insensitive', () => {
    const manga = { genre: 'Action/Fantasy' };
    expect(mangaHasGenre(manga, 'action')).toBe(true);
    expect(mangaHasGenre(manga, 'FANTASY')).toBe(true);
  });

  test('should return false for manga without genre', () => {
    const manga = { title: 'No Genre' };
    expect(mangaHasGenre(manga, 'Action')).toBe(false);
  });
});

describe('genre spelling from the catalogue', () => {
  test('keeps hyphenated and multi-word genres readable', () => {
    expect(parseGenres('Action, sci-fi, slice of life')).toEqual(['Action', 'Sci-Fi', 'Slice of Life']);
  });

  test('matches multi-word genres case-insensitively', () => {
    expect(mangaHasGenre({ genre: 'Drama, Slice of Life' }, 'slice of life')).toBe(true);
  });
});
