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
    
    if (url.startsWith('/media/')) {
      const baseUrl = API_URL; 
      return `${baseUrl}${url}`;
    }
    
    return url;
  };

  const filteredMangas = mangas.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.author && m.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-200 p-4 md:p-10">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        
        <div className="bg-gray-50 rounded-full px-6 py-3 mb-8 flex items-center shadow-inner border border-gray-100">
          <input 
            type="text" 
            placeholder="ค้นหาหนังสือ (ชื่อเรื่อง, ผู้แต่ง)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-gray-700"
          />
        </div>

        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-black hover:text-gray-600">
             <span className="text-2xl font-bold">← กลับ</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">รายการหนังสือทั้งหมด</h1>
          <Link to="/admin/mangas/new" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-sm text-sm">
            + เพิ่มหนังสือ
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMangas.map(manga => (
            <Link key={manga.id} to={`/admin/mangas/${manga.id}`} className="border border-gray-100 rounded-2xl p-4 flex gap-4 hover:shadow-lg transition bg-white shadow-sm">
              <img src={getImageUrl(manga.cover_image_url)} alt={manga.title} className="w-24 h-36 object-cover rounded-md shadow-sm border border-gray-200" />
              <div className="flex flex-col justify-center">
                <h3 className="text-indigo-900 font-bold text-lg mb-2 line-clamp-2">{manga.title}</h3>
                <p className="text-xs text-gray-600 mb-1">ผู้แต่ง: {manga.author}</p>
                <p className="text-xs text-gray-600 font-bold mt-2">จำนวนสำเนา: {manga.copies?.length || 0} เล่ม</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AdminMangas;