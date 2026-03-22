import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Search = () => {
  const [mangas, setMangas] = useState([]);
  const [filteredMangas, setFilteredMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [allGenres, setAllGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150x220?text=No+Cover';
    
    if (url.startsWith('http')) return url;

    if (url.startsWith('/images/') || url.startsWith('images/')) {
      return url.startsWith('/') ? url : `/${url}`;
    }

    const baseUrl = API_URL ? API_URL.replace(/\/$/, '') : 'http://localhost:8000';
    
    if (url.startsWith('/media/') || url.startsWith('media/')) {
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${baseUrl}${cleanPath}`;
    }

    return `${baseUrl}/media/${url}`;
  };

  useEffect(() => {
    
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => {
        setMangas(data);
        setFilteredMangas(data);
        
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

  useEffect(() => {
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

    setFilteredMangas(result);
  }, [searchTerm, selectedGenres, mangas]);

  const toggleGenre = (genre) => {
    if (!selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
      setGenreSearch('');
    }
  };

  const removeGenre = (genre) => {
    setSelectedGenres(selectedGenres.filter(g => g !== genre));
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center text-2xl font-bold text-indigo-900 bg-gray-50">Loading data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-slate-900 mb-8 text-center tracking-tight">Search</h2>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10">
          
          <div className="mb-6 relative">
            <input 
              type="text" 
              placeholder="Search by manga title or author..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg rounded-lg px-5 py-4 pl-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            />
            <svg className="w-6 h-6 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filter by genre
            </h3>

            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {selectedGenres.length === 0 && <span className="text-slate-500 text-sm italic">No genres selected</span>}
              {selectedGenres.map(genre => (
                <span key={genre} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                  {genre}
                  <button onClick={() => removeGenre(genre)} className="hover:text-red-300 focus:outline-none transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </span>
              ))}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <input 
                type="text" 
                placeholder="Search genres" 
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm rounded-lg px-4 py-2 mb-3 focus:outline-none focus:border-blue-400"
              />
              
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {allGenres
                  .filter(genre => !selectedGenres.includes(genre))
                  .filter(genre => genre.toLowerCase().includes(genreSearch.toLowerCase()))
                  .map(genre => (
                    <button 
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className="bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-full text-sm font-medium transition shadow-sm"
                    >
                      + {genre}
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 text-gray-600 font-semibold flex justify-between items-end">
          <span>Results: <span className="text-blue-600 text-xl font-bold">{filteredMangas.length}</span> items</span>
        </div>

        {filteredMangas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-slate-200">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h2 className="text-2xl font-bold text-slate-500 mb-2">No manga found</h2>
            <p className="text-slate-400">Try a different keyword or remove some genre filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMangas.map((manga) => (
              <div key={manga.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300 flex flex-col">
                <Link to={`/comic/${manga.id}`} className="flex-1 flex flex-col">
                  <div className="relative pb-[140%]">
                    <img
                      src={getImageUrl(manga.cover_image_url)} 
                      alt={manga.title}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug" title={manga.title}>{manga.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 truncate" title={manga.author}>{manga.author}</p>
                    
                    <div className="flex justify-between items-center mt-auto pt-2">
                      <span className="text-xs font-semibold text-amber-500">
                        ★ {manga.avg_rating || '0.0'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Sold {manga.sold_count || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
};

export default Search;