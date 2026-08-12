import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../api';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const ForYou = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPreferences, setHasPreferences] = useState(false);

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

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        // ถ้าไม่มี Token (ยังไม่ได้ Login) ให้เตือนผู้ใช้
        if (!token) {
           setError("กรุณาเข้าสู่ระบบเพื่อดูมังงะแนะนำเฉพาะคุณ");
           setLoading(false);
           return;
        }

        // ยิง API ไปที่ระบบ MBRS ของเรา
        const response = await authFetch(`${API_URL}/api/recommendations/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setMangas(data.recommendations || data);
        setHasPreferences(data.has_preferences || false);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError("ไม่สามารถโหลดข้อมูลแนะนำได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-brand-light">
        <div className="text-center text-2xl font-bold text-brand-primary animate-pulse">
          Generating recommendations from MBRS...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-brand-light">
        <div className="text-center text-xl text-red-500 font-semibold p-6 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light py-12 px-6">
      <h2 className="text-4xl font-bold text-brand-primary mb-2 text-center">FOR YOU</h2>
      <p className="text-center text-brand-primary mb-10">Recommended manga for you</p>

      {!hasPreferences && (
        <div className="max-w-2xl mx-auto mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 ยังไม่ได้ตั้งค่าความชอบ</h3>
          <p className="text-blue-700 mb-4">
            เลือก 4 มังงะที่คุณชอบเพื่อรับคำแนะนำที่ตรงใจมากขึ้น!
          </p>
          <Link
            to="/onboarding"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            เลือกมังงะที่ชอบ
          </Link>
        </div>
      )}

      {mangas.length === 0 ? (
        <div className="text-center text-brand-primary mt-10 text-lg p-8 border-2 border-dashed border-brand-secondary rounded-xl max-w-2xl mx-auto">
          ยังไม่มีข้อมูลแนะนำสำหรับคุณ <br/> ลองเช่าหรือหยิบมังงะลงตะกร้าดูก่อนสิ!
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {mangas.map(manga => (
            <div key={manga.id} className="bg-brand-light rounded-xl shadow-sm border border-brand-secondary overflow-hidden transform hover:-translate-y-2 transition duration-300 flex flex-col">
              <Link to={`/manga/${manga.id}`} className="flex-grow flex flex-col">
                <img
                  src={getImageUrl(manga.cover_image_url)}
                  alt={manga.title}
                  className="w-full h-72 object-cover"
                />
                <div className="p-4 flex-grow">
                  <h3 className="text-xl font-semibold text-brand-primary truncate">{manga.title}</h3>
                  <p className="text-sm text-brand-primary mt-1">{manga.genre}</p>

                  {manga.explanation && (
                    <p className="text-xs text-blue-600 mt-2 italic border-l-2 border-blue-400 pl-2">
                      {manga.explanation}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex justify-between items-end border-t border-brand-secondary pt-3 px-4 pb-3">
                  <div className="flex text-brand-accent text-sm">
                    {renderStars(manga.avg_rating)}
                  </div>
                  <span className="text-xs font-semibold text-brand-primary bg-brand-light px-2 py-1 rounded-lg">
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

export default ForYou;