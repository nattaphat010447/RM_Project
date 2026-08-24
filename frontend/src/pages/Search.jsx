import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MangaCard from '../components/MangaCard';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'title', label: 'Title A–Z' },
];

const hasAvailableCopy = (manga) =>
  Array.isArray(manga.copies) && manga.copies.some(copy => copy.status === 'AVAILABLE');

const CheckboxItem = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative flex items-center justify-center">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-5 h-5 border-2 rounded bg-white transition-colors group-hover:border-lumina-primary ${checked ? 'border-lumina-primary bg-lumina-primary' : 'border-lumina-outline'}`}>
        {checked && (
          <svg className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
          </svg>
        )}
      </div>
    </div>
    <span className={`font-inter text-sm transition-colors ${checked ? 'text-lumina-text font-medium' : 'text-lumina-text-muted group-hover:text-lumina-text'}`}>{label}</span>
  </label>
);

const FilterPanelContent = ({
  selectedGenres,
  allGenres,
  genreSearch,
  setGenreSearch,
  toggleGenre,
  removeGenre,
  availabilityOnly,
  setAvailabilityOnly,
}) => {
  const availableGenres = allGenres
    .filter(genre => !selectedGenres.includes(genre))
    .filter(genre => genre.toLowerCase().includes(genreSearch.toLowerCase()));

  return (
    <>
      <div className="bg-white rounded-xl p-4 shadow-lumina-sm">
        <h3 className="font-jakarta font-semibold text-lg text-lumina-text mb-3 border-b border-lumina-outline/50 pb-2">Genre</h3>

        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedGenres.map(genre => (
              <span key={genre} className="inline-flex items-center gap-1.5 bg-lumina-primary-soft text-lumina-primary px-3 py-1 rounded-full font-inter text-xs font-semibold animate-fade-in">
                {genre}
                <button onClick={() => removeGenre(genre)} aria-label={`Remove ${genre}`} className="hover:text-lumina-text focus:outline-none transition">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder="Search genres"
          value={genreSearch}
          onChange={(e) => setGenreSearch(e.target.value)}
          className="w-full bg-lumina-surface-alt border border-lumina-outline/60 rounded-lg px-3 py-2 mb-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow"
        />

        <div className="space-y-2.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
          {availableGenres.map(genre => (
            <CheckboxItem key={genre} label={genre} checked={false} onChange={() => toggleGenre(genre)} />
          ))}
          {availableGenres.length === 0 && (
            <p className="font-inter text-xs text-lumina-text-muted italic py-1">No matching genres</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-lumina-sm">
        <h3 className="font-jakarta font-semibold text-lg text-lumina-text mb-3 border-b border-lumina-outline/50 pb-2">Availability</h3>
        <CheckboxItem
          label="Available Now"
          checked={availabilityOnly}
          onChange={() => setAvailabilityOnly(!availabilityOnly)}
        />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F5F3FF; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CCC3D7; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5300B7; }
      `}} />
    </>
  );
};

const Search = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('query') || '';
  const handleSearchChange = (value) => setSearchParams(value ? { query: value } : {}, { replace: true });
  const clearSearch = () => setSearchParams({}, { replace: true });
  const [allGenres, setAllGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => {
        setMangas(data);

        const genresSet = new Set();
        data.forEach(manga => {
          if (manga.genre) {
            const parts = manga.genre.split('/');
            parts.forEach(part => {
              if (part.trim() !== '') genresSet.add(part.trim());
            });
          }
        });

        setAllGenres(Array.from(genresSet).sort());
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredMangas = useMemo(() => {
    let result = mangas;

    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(manga =>
        manga.title.toLowerCase().includes(lowerSearch) ||
        (manga.author && manga.author.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedGenres.length > 0) {
      result = result.filter(manga => {
        if (!manga.genre) return false;
        const mangaGenres = manga.genre.split('/').map(g => g.trim());
        return selectedGenres.some(selected => mangaGenres.includes(selected));
      });
    }

    if (availabilityOnly) {
      result = result.filter(hasAvailableCopy);
    }

    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    } else if (sortBy === 'popular') {
      result = [...result].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [mangas, searchTerm, selectedGenres, availabilityOnly, sortBy]);

  const toggleGenre = (genre) => {
    if (!selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
      setGenreSearch('');
    }
  };

  const removeGenre = (genre) => {
    setSelectedGenres(selectedGenres.filter(g => g !== genre));
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center font-jakarta text-xl font-semibold text-lumina-text-muted bg-lumina-surface">Loading data...</div>;

  return (
    <div className="min-h-screen bg-lumina-surface pb-20 overflow-x-hidden">
      <main className="max-w-screen-xl mx-auto px-4 md:px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <header className="lg:col-span-12 flex flex-col gap-6 pb-6 border-b border-lumina-outline/50">
          <div>
            <h1 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text mb-1">Discover Manga</h1>
            <p className="font-jakarta text-base md:text-lg text-lumina-text-muted">Explore manga titles across all available genres.</p>
          </div>

          <div className="relative w-full">
            <svg className="w-5 h-5 text-lumina-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input
              type="text"
              placeholder="Search manga..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-white border border-lumina-outline/60 rounded-lg pl-11 pr-11 py-3.5 font-jakarta text-base text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow"
            />
            {searchTerm !== '' && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-lumina-surface-alt hover:bg-lumina-primary-soft text-lumina-text-muted hover:text-lumina-primary transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>
        </header>

        <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-6">
          <FilterPanelContent
            selectedGenres={selectedGenres}
            allGenres={allGenres}
            genreSearch={genreSearch}
            setGenreSearch={setGenreSearch}
            toggleGenre={toggleGenre}
            removeGenre={removeGenre}
            availabilityOnly={availabilityOnly}
            setAvailabilityOnly={setAvailabilityOnly}
          />
        </aside>

        <div className="lg:col-span-9 flex flex-col gap-6">

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-3 rounded-lg shadow-lumina-sm">
            <p className="font-jakarta text-sm text-lumina-text-muted">
              Showing <span className="font-bold text-lumina-text">{filteredMangas.length}</span> of {mangas.length} titles
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="sort-by" className="font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Sort By:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-lumina-surface-alt border border-lumina-outline/60 text-lumina-text font-inter text-sm rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-lumina-primary focus:border-lumina-primary"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                className="lg:hidden flex items-center gap-2 p-2 text-sm font-inter font-semibold text-lumina-text bg-lumina-surface-alt hover:bg-lumina-primary-soft rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="lg:hidden space-y-6">
              <FilterPanelContent
                selectedGenres={selectedGenres}
                allGenres={allGenres}
                genreSearch={genreSearch}
                setGenreSearch={setGenreSearch}
                toggleGenre={toggleGenre}
                removeGenre={removeGenre}
                availabilityOnly={availabilityOnly}
                setAvailabilityOnly={setAvailabilityOnly}
              />
            </div>
          )}

          {filteredMangas.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lumina-sm p-16 text-center">
              <svg className="w-14 h-14 text-lumina-outline mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h2 className="font-jakarta text-2xl font-bold text-lumina-text mb-2">No manga found</h2>
              <p className="font-jakarta text-lumina-text-muted">Try a different title, author, or genre.</p>
              {searchTerm !== '' && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 font-inter text-sm font-semibold bg-lumina-primary hover:bg-lumina-primary-light text-white px-6 py-2 rounded-full shadow-lumina-sm transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredMangas.map(manga => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Search;
