import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const ForYou = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const renderStars = (rating) => {
    const num = Math.round(rating || 0);
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  };
  
  // TODO: Replace hardcoded IDs with real recommendations from the MBCGCN model API.
  const recommendedIds = [1, 2, 3]; 

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(m => recommendedIds.includes(m.id));
        setMangas(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center mt-20 text-2xl">Generating recommendations from the model...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <h2 className="text-4xl font-bold text-slate-900 mb-2 text-center">FOR YOU</h2>
      <p className="text-center text-slate-600 mb-10">Recommended manga for you</p>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {mangas.map(manga => (
          <div key={manga.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transform hover:-translate-y-2 transition duration-300">
            <Link to={`/comic/${manga.id}`}>
              <img
                src={getImageUrl(manga.cover_image_url)}
                alt={manga.title}
                className="w-full h-72 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold text-slate-900 truncate">{manga.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{manga.genre}</p>
              </div>
              
              <div className="mt-auto flex justify-between items-end border-t border-slate-200 pt-3 px-4 pb-3">
                <div className="flex text-amber-400 text-sm">
                  {renderStars(manga.avg_rating)}
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                  Sold {manga.sold_count || 0}
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForYou;