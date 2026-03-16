import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Popular = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    
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

  if (loading) return <div className="text-center mt-20 text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <h2 className="text-4xl font-black text-indigo-900 mb-2 text-center">POPULAR THIS WEEK</h2>
      <p className="text-center text-gray-500 mb-10">มังงะที่มีการกดเช่ามากที่สุดในช่วง 7 วันที่ผ่านมา</p>

      {mangas.length === 0 ? (
        <div className="text-center text-gray-500 font-bold text-2xl mt-20">
          ไม่มีมังงะยอดฮิตในสัปดาห์นี้
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {mangas.map((manga, index) => (
            <div key={manga.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition duration-300 relative">
              <div className="absolute top-2 left-2 bg-yellow-400 text-gray-900 w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                #{index + 1}
              </div>
              <Link to={`/comic/${manga.id}`}>
                <img src={manga.cover_image_url} alt={manga.title} className="w-full h-72 object-cover" />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 truncate">{manga.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{manga.genre}</p>
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