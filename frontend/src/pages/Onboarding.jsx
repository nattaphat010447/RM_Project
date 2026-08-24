import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const Onboarding = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/images/') || url.startsWith('images/')) {
      return url.startsWith('/') ? url : `/${url}`;
    }
    const baseUrl = API_URL ? API_URL.replace(/\/$/, '') : 'http://localhost:8000';
    if (url.startsWith('/media/') || url.startsWith('media/')) {
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${baseUrl}${cleanPath}`;
    }
    return `${baseUrl}${url}`;
  };

  const [mangas, setMangas] = useState([]);
  const [selectedMangas, setSelectedMangas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingPreferences, setExistingPreferences] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/signin'); return; }

    let isMounted = true;

    authFetch(`${API_URL}/api/preferences/`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        if (!isMounted) return;
        if (data.has_preferences && data.preferences) {
          const prefIds = data.preferences.map(p => p.manga_id);
          setExistingPreferences(prefIds);
          setSelectedMangas(prefIds);
        }
      })
      .catch(() => {});

    fetch(`${API_URL}/api/mangas/`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => { if (isMounted) { setMangas(data); setLoading(false); } })
      .catch(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [API_URL, navigate]);

  const toggleManga = (mangaId) => {
    if (selectedMangas.includes(mangaId)) {
      setSelectedMangas(selectedMangas.filter(id => id !== mangaId));
    } else {
      if (selectedMangas.length < 4) {
        setSelectedMangas([...selectedMangas, mangaId]);
      } else {
        alert('You can select up to 4 manga.');
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedMangas.length !== 4) { alert('Please select exactly 4 manga.'); return; }
    setSaving(true);
    try {
      const response = await authFetch(`${API_URL}/api/preferences/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manga_ids: selectedMangas })
      });
      const data = await response.json();
      if (response.ok) { navigate('/for-you'); }
      else { alert(data.error || 'An error occurred.'); }
    } catch {
      alert('System error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMangas = mangas.filter(manga =>
    manga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manga.author && manga.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-brand-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-primary font-medium">Loading manga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light pb-28 px-4 pt-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-primary mb-2">
            {existingPreferences.length > 0 ? 'Update Preferences' : 'Choose Your Favourite Manga'}
          </h1>
          <p className="text-brand-primary text-sm">
            Select <span className="font-bold">4 manga</span> to receive tailored recommendations
          </p>
          <div className="mt-3 inline-block bg-brand-light shadow-md rounded-lg px-6 py-2">
            <p className="text-sm text-brand-primary">
              Selected: <span className="text-xl font-bold">{selectedMangas.length}</span> / 4
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 bg-brand-light rounded-lg px-4 py-2 flex items-center shadow-md">
          <svg className="w-5 h-5 text-brand-primary mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search manga or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-brand-primary text-sm"
          />
        </div>

        {/* Manga Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredMangas.map(manga => {
            const isSelected = selectedMangas.includes(manga.id);
            return (
              <div
                key={manga.id}
                onClick={() => toggleManga(manga.id)}
                className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl ${
                  isSelected
                    ? 'shadow-xl ring-2 ring-brand-primary ring-offset-2'
                    : 'shadow-md hover:scale-105'
                }`}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-gray-100">
                  {getImageUrl(manga.cover_image_url) ? (
                    <img
                      src={getImageUrl(manga.cover_image_url)}
                      alt={manga.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold">
                      ?
                    </div>
                  )}
                </div>

                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-brand-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow">
                    ✓
                  </div>
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3">
                  <h3 className="text-xs font-semibold text-white line-clamp-2">{manga.title}</h3>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Submit Button — fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-light border-t border-gray-200 shadow-md py-4 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={selectedMangas.length !== 4 || saving}
            className={`w-full font-bold py-3 rounded-lg transition duration-200 shadow-md text-sm ${
              selectedMangas.length === 4 && !saving
                ? 'bg-brand-light text-brand-primary hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : selectedMangas.length === 4 ? 'Save Preferences' : `Select ${4 - selectedMangas.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
