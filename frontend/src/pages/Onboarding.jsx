import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const Onboarding = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [mangas, setMangas] = useState([]);
  const [selectedMangas, setSelectedMangas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingPreferences, setExistingPreferences] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    // Fetch existing preferences
    authFetch(`${API_URL}/api/preferences/`)
      .then(res => res.json())
      .then(data => {
        if (data.has_preferences && data.preferences) {
          const prefIds = data.preferences.map(p => p.manga_id);
          setExistingPreferences(prefIds);
          setSelectedMangas(prefIds);
        }
      })
      .catch(err => console.error('Error loading preferences:', err));

    // Fetch all mangas
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => {
        setMangas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
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
    if (selectedMangas.length !== 4) {
      alert('Please select exactly 4 manga.');
      return;
    }

    setSaving(true);

    try {
      const response = await authFetch(`${API_URL}/api/preferences/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manga_ids: selectedMangas })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Preferences saved successfully.');
        navigate('/for-you');
      } else {
        alert(data.error || 'An error occurred.');
      }
    } catch (err) {
      console.error(err);
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
      <div className="min-h-screen flex justify-center items-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-lg font-bold">Loading manga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-3">
            {existingPreferences.length > 0 ? 'Recalibrate Preferences' : 'Choose Your Favourite Manga'}
          </h1>
          <p className="text-slate-400 text-lg">
            Select <span className="text-cyan-400 font-bold">4 manga</span> to receive tailored recommendations
          </p>
          <div className="mt-4 inline-block bg-slate-800 border border-slate-700 rounded-lg px-6 py-3">
            <p className="text-sm text-slate-300">
              Selected: <span className="text-2xl font-black text-cyan-400">{selectedMangas.length}</span> / 4
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search manga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border-2 border-slate-700 text-slate-100 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        {/* Manga Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
          {filteredMangas.map(manga => {
            const isSelected = selectedMangas.includes(manga.id);
            return (
              <div
                key={manga.id}
                onClick={() => toggleManga(manga.id)}
                className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all duration-200 transform hover:scale-105 ${
                  isSelected
                    ? 'border-cyan-400 shadow-lg shadow-cyan-400/50'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-slate-800">
                  {manga.cover_image_url ? (
                    <img
                      src={`${API_URL}${manga.cover_image_url}`}
                      alt={manga.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-4xl font-bold">
                      📚
                    </div>
                  )}
                </div>

                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-cyan-400 text-slate-900 rounded-full w-10 h-10 flex items-center justify-center font-black text-xl shadow-lg">
                    ✓
                  </div>
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent p-4">
                  <h3 className="text-sm font-bold text-white line-clamp-2">{manga.title}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm py-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={selectedMangas.length !== 4 || saving}
              className={`w-full font-black text-lg py-4 rounded-xl transition duration-200 shadow-lg ${
                selectedMangas.length === 4 && !saving
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : selectedMangas.length === 4 ? 'Save Preferences' : `Select ${4 - selectedMangas.length} more`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
