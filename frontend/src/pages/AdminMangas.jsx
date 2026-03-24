import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminMangas = () => {
  const [mangas, setMangas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => setMangas(data));
  }, [API_URL]);

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

  const filteredMangas = mangas.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.author && m.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-brand-light p-4 md:p-10">
      <div className="max-w-6xl mx-auto bg-brand-light rounded-xl shadow-md p-8">
        
        <div className="bg-brand-light rounded-lg px-6 py-3 mb-8 flex items-center shadow-md">
          <input 
            type="text" 
            placeholder="Search manga (title, author)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-brand-primary"
          />
        </div>

        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-brand-primary hover:text-brand-primary font-semibold">
             <span className="text-2xl font-bold">← Back</span>
          </button>
          <h1 className="text-2xl font-bold text-brand-primary">All Manga</h1>
          <Link to="/admin/mangas/new" className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-2 px-4 rounded-lg transition text-sm">
            + Add Manga
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMangas.map(manga => (
            <Link key={manga.id} to={`/admin/mangas/${manga.id}`} className="rounded-xl p-4 flex gap-4 hover:shadow-xl transition bg-brand-light shadow-md">
              <img src={getImageUrl(manga.cover_image_url)} alt={manga.title} className="w-24 h-36 object-cover rounded-lg shadow-md" />
              <div className="flex flex-col justify-center">
                <h3 className="text-brand-primary font-semibold text-lg mb-2 line-clamp-2">{manga.title}</h3>
                <p className="text-xs text-brand-primary mb-1">Author: {manga.author}</p>
                <p className="text-xs text-brand-primary font-medium mt-2">Copies: {manga.copies?.length || 0}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AdminMangas;