import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

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

const MangaCard = ({ manga }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col hover:shadow-lg transition-shadow duration-300">
      <img src={getImageUrl(comic.cover_image_url)} alt={comic.title} className="w-full h-64 object-cover rounded-lg mb-4" />
      
      <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">{comic.title}</h3>
      
      <div className="flex flex-col mt-2 mb-4 gap-2">
        <div className="flex justify-between items-center">
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide truncate max-w-[100px]">
            {comic.genre}
          </span>
          <div className="flex text-amber-400 text-sm" title={`Rating: ${comic.avg_rating || 0}`}>
            {renderStars(comic.avg_rating)}
          </div>
        </div>
        <div className="text-xs font-medium text-slate-500 text-right">
          Sold {comic.sold_count || 0}
        </div>
      </div>
      
      <Link 
        to={`/comic/${comic.id}`}
        className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 shadow-sm block text-center"
      >
        Rent
      </Link>
    </div>
  );
};

const Home = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(response => response.json())
      .then(data => {
        setMangas(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="relative bg-slate-900 w-full h-80 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 40px, rgba(59, 130, 246, 0.1) 40px, rgba(59, 130, 246, 0.1) 80px)' }}></div>
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide drop-shadow-lg mb-4 text-center">
            COMIC BOOK RENTAL STORE
          </h1>
           <div className="w-40 h-40 bg-blue-100 rounded-full border-4 border-blue-400 flex items-center justify-center overflow-hidden shadow-lg">
             <span className="font-semibold text-blue-900">Store Logo</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        
        {loading ? (
          <div className="text-center text-xl font-semibold text-slate-500 my-20">Loading Comics...</div>
        ) : (
          <>
            <section>
              <h2 className="section-header mb-6">Recommended for You</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {mangas.slice(0, 3).map(manga => (
                  <MangaCard key={`rec-${manga.id}`} manga={manga} />
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="text-slate-600 hover:text-blue-600 font-semibold flex items-center transition">
                  More <span className="ml-1">→</span>
                </button>
              </div>
            </section>

            <section>
              <h2 className="section-header mb-6">Popular This Week</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {mangas.slice(3, 6).map(manga => (
                  <MangaCard key={`pop-${manga.id}`} manga={manga} />
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="text-slate-600 hover:text-blue-600 font-semibold flex items-center transition">
                  More <span className="ml-1">→</span>
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
};

export default Home;