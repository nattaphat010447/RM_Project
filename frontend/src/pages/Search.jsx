import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Search = () => {
  const [mangas, setMangas] = useState([]);
  const [filteredMangas, setFilteredMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [allGenres, setAllGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    
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

  if (loading) return <div className="min-h-screen flex justify-center items-center text-2xl font-bold text-indigo-900 bg-gray-50">Loading Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-indigo-900 mb-8 text-center uppercase tracking-wider">Search</h2>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-10">
          
          <div className="mb-6 relative">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อมังงะ หรือ ชื่อผู้เขียน..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-200 text-gray-800 text-lg rounded-xl px-5 py-4 pl-12 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
            />
            <svg className="w-6 h-6 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              กรองตามหมวดหมู่
            </h3>

            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {selectedGenres.length === 0 && <span className="text-gray-400 text-sm italic">ยังไม่ได้เลือกหมวดหมู่</span>}
              {selectedGenres.map(genre => (
                <span key={genre} className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                  {genre}
                  <button onClick={() => removeGenre(genre)} className="hover:text-red-300 focus:outline-none transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </span>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <input 
                type="text" 
                placeholder="ค้นหาหมวดหมู่ที่ต้องการ" 
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 mb-3 focus:outline-none focus:border-indigo-400"
              />
              
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {allGenres
                  .filter(genre => !selectedGenres.includes(genre))
                  .filter(genre => genre.toLowerCase().includes(genreSearch.toLowerCase()))
                  .map(genre => (
                    <button 
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className="bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-600 px-3 py-1.5 rounded-full text-sm font-medium transition shadow-sm"
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
          <span>พบผลลัพธ์: <span className="text-indigo-600 text-xl font-black">{filteredMangas.length}</span> รายการ</span>
        </div>

        {filteredMangas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border-dashed border-2 border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h2 className="text-2xl font-bold text-gray-500 mb-2">ไม่พบมังงะที่คุณค้นหา</h2>
            <p className="text-gray-400">ลองเปลี่ยนคำค้นหา หรือเอาตัวกรองหมวดหมู่ออกดูนะครับ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMangas.map((manga) => (
              <div key={manga.id} className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-xl transition duration-300 flex flex-col">
                <Link to={`/comic/${manga.id}`} className="flex-1">
                  <div className="relative pb-[140%]">
                    <img src={manga.cover_image_url} alt={manga.title} className="absolute top-0 left-0 w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug" title={manga.title}>{manga.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 truncate" title={manga.author}>{manga.author}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        ★ {manga.avg_rating || 'N/A'}
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