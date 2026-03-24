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
    <div className="bg-brand-light rounded-xl shadow-md p-4 flex flex-col hover:shadow-xl transition-shadow duration-300">
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
    <div className="min-h-screen bg-brand-light pb-12">
      <div className="w-full h-80 overflow-hidden">
        <img
          src="/images/mangas/banner.svg"
          alt="Manga Book Rental Store Banner"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        
        {loading ? (
          <div className="text-center text-xl font-semibold text-brand-primary my-20">Loading Mangas...</div>
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
                <button className="text-brand-primary hover:text-brand-secondary font-semibold flex items-center transition">
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
                <button className="text-brand-primary hover:text-brand-secondary font-semibold flex items-center transition">
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