import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const ForYou = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150x220?text=No+Cover';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/media/')) {
      const baseUrl = API_URL || ''; 
      return `${baseUrl.replace(/\/$/, '')}${url}`;
    }
    return url;
  };
  
  // TODO: ในอนาคตจะเปลี่ยนเป็นการเรียก API ที่ให้คำแนะนำจากโมเดล MBCGCN จริงๆ แทนการ hardcode ID แบบนี้
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

  if (loading) return <div className="text-center mt-20 text-2xl">กำลังประมวลผลคำแนะนำจาก โมเดล</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <h2 className="text-4xl font-black text-indigo-900 mb-2 text-center">FOR YOU</h2>
      <p className="text-center text-gray-500 mb-10">Recommended manga for you</p>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {mangas.map(manga => (
          <div key={manga.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition duration-300">
            <Link to={`/comic/${manga.id}`}>
              <img
                src={getImageUrl(manga.cover_image_url)}
                alt={manga.title}
                className="w-full h-72 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 truncate">{manga.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{manga.genre}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForYou;