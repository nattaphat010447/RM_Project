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
    <div className="min-h-screen bg-brand-light py-12 px-6">
      <h2 className="text-4xl font-bold text-brand-primary mb-2 text-center">FOR YOU</h2>
      <p className="text-center text-brand-primary mb-10">Recommended manga for you</p>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {mangas.map(manga => (
          <div key={manga.id} className="bg-brand-light rounded-xl shadow-md p-4 flex flex-col hover:shadow-xl transition-shadow duration-300">
            <img src={getImageUrl(manga.cover_image_url)} alt={manga.title} className="w-full h-64 object-cover rounded-lg mb-4" />
            
            <h3 className="font-semibold text-lg text-brand-primary line-clamp-1">{manga.title}</h3>
            
            <div className="flex flex-col mt-2 mb-4 gap-2">
              <span className="bg-brand-light text-brand-primary text-xs font-semibold rounded-full uppercase tracking-wide truncate">
                {manga.genre}
              </span>
              <div className="flex justify-between items-center">
                <div className="flex text-brand-accent text-sm" title={`Rating: ${manga.avg_rating || 0}`}>
                  {renderStars(manga.avg_rating)}
                </div>
                <div className="text-xs font-medium text-brand-primary text-right">
                  Sold {manga.sold_count || 0}
                </div>
              </div>
            </div>
            
            <Link 
              to={`/manga/${manga.id}`}
              className="mt-auto w-full bg-brand-secondary hover:bg-brand-primary text-brand-light font-semibold py-2 rounded-lg transition duration-200 shadow-sm block text-center"
            >
              Rent
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForYou;