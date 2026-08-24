import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/image';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Popular = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  const renderStars = (rating) => {
    const num = Math.round(rating || 0);
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  };

  useEffect(() => {

    fetch(`${API_URL}/api/mangas/popular/`)
      .then(res => res.json())
      .then(data => {
        setMangas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-lumina-surface">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-lumina-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-lumina-surface py-12 px-6">
      <h2 className="font-jakarta text-3xl md:text-4xl font-extrabold tracking-tight text-lumina-text mb-2 text-center">POPULAR THIS WEEK</h2>
      <p className="text-center font-inter text-lumina-text-muted mb-10">Most rented manga during the last 7 days</p>

      {mangas.length === 0 ? (
        <div className="text-center font-jakarta text-lumina-text-muted font-semibold text-xl mt-20 p-8 border-2 border-dashed border-lumina-outline rounded-xl max-w-2xl mx-auto">
          No trending manga this week
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {mangas.map((manga, index) => (
            <div key={manga.id} className="bg-white rounded-xl shadow-lumina-sm overflow-hidden transform hover:-translate-y-1 hover:shadow-lumina-lg transition-all duration-200 relative">
              <div className="absolute top-2 left-2 z-10 bg-lumina-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-jakarta font-bold text-base shadow-lumina-sm border-2 border-white">
                #{index + 1}
              </div>
              <Link to={`/manga/${manga.id}`}>
                <img
                  src={getImageUrl(manga.cover_image_url)}
                  alt={manga.title}
                  className="w-full h-72 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-jakarta text-lg font-semibold text-lumina-text truncate">{manga.title}</h3>
                  <p className="font-inter text-sm text-lumina-text-muted mt-1">{manga.genre}</p>
                </div>

                <div className="mt-auto flex justify-between items-end border-t border-lumina-outline/50 pt-3 px-4 pb-3">
                  <div className="flex text-amber-400 text-sm" aria-label={`${manga.avg_rating || 0} out of 5 stars`}>
                    {renderStars(manga.avg_rating)}
                  </div>
                  <span className="font-inter text-xs font-semibold text-lumina-text-muted bg-lumina-surface-alt px-2 py-1 rounded-lg">
                    Sold {manga.sold_count || 0}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Popular;
