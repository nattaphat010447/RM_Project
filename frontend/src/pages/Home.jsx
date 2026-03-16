import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ComicCard = ({ comic }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col hover:shadow-xl transition-shadow duration-300">
      <img src={comic.cover_image_url} alt={comic.title} className="w-full h-64 object-cover rounded-xl mb-4" />
      
      <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{comic.title}</h3>
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide truncate max-w-[100px]">
          {comic.genre}
        </span>
        <div className="flex text-yellow-400 text-sm">
          {'★'.repeat(4)}{'☆'.repeat(1)}
        </div>
      </div>
      
      <Link 
        to={`/comic/${comic.id}`}
        className="mt-auto w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-xl transition duration-200 shadow-sm block text-center"
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
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="relative bg-blue-900 w-full h-80 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.3) 10deg 20deg)' }}></div>
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-lg mb-4 text-center transform -rotate-2">
            COMIC BOOK RENTAL STORE
          </h1>
          <div className="w-40 h-40 bg-yellow-300 rounded-full border-4 border-yellow-500 flex items-center justify-center overflow-hidden shadow-2xl">
             <span className="font-bold text-yellow-800">Zenitsu Image</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        
        {loading ? (
          <div className="text-center text-xl font-bold text-gray-500 my-20">Loading Comics...</div>
        ) : (
          <>
            <section>
              <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-600 pl-4">Recommend for You</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {mangas.slice(0, 3).map(comic => (
                  <ComicCard key={`rec-${comic.id}`} comic={comic} />
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="text-gray-500 hover:text-purple-600 font-bold flex items-center transition">
                  More <span className="ml-1">→</span>
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-600 pl-4">Popular This Week</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {mangas.slice(3, 6).map(comic => (
                  <ComicCard key={`pop-${comic.id}`} comic={comic} />
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button className="text-gray-500 hover:text-purple-600 font-bold flex items-center transition">
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