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

    // Guards against a slow response from a previous mount (e.g. dev
    // StrictMode's double-invoke, or the user navigating away and back
    // quickly) landing after this effect's own cleanup and clobbering
    // state with stale data.
    let isMounted = true;

    // Fetch existing preferences
    authFetch(`${API_URL}/api/preferences/`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load preferences');
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (data.has_preferences && data.preferences) {
          const prefIds = data.preferences.map(p => p.manga_id);
          setExistingPreferences(prefIds);
          setSelectedMangas(prefIds);
        }
      })
      .catch(err => console.error('Error loading preferences:', err));

    // Fetch all mangas
    fetch(`${API_URL}/api/mangas/`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load manga list');
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        setMangas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
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
      <div className="min-h-screen flex justify-center items-center bg-lumina-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-lumina-primary mx-auto mb-4"></div>
          <p className="font-jakarta font-semibold text-lg text-lumina-text-muted">Loading manga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lumina-surface py-12 px-4 pb-36">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-jakarta text-3xl md:text-4xl font-extrabold tracking-tight text-lumina-text mb-3">
            {existingPreferences.length > 0 ? 'Recalibrate Preferences' : 'Choose Your Favourite Manga'}
          </h1>
          <p className="font-jakarta text-lg text-lumina-text-muted">
            Select <span className="text-lumina-primary font-bold">4 manga</span> to receive tailored recommendations
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-white border border-lumina-outline/50 rounded-full px-6 py-2.5 shadow-lumina-sm">
            <p className="font-inter text-sm text-lumina-text-muted">
              Selected:
            </p>
            <span className="font-jakarta text-2xl font-extrabold text-lumina-primary leading-none">{selectedMangas.length}</span>
            <span className="font-inter text-sm text-lumina-text-muted">/ 4</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-xl mx-auto">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-lumina-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search manga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-lumina-outline/60 rounded-full pl-12 pr-6 py-3.5 font-inter text-base text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow"
          />
        </div>

        {/* Manga Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {filteredMangas.map(manga => {
            const isSelected = selectedMangas.includes(manga.id);
            return (
              <div
                key={manga.id}
                onClick={() => toggleManga(manga.id)}
                role="button"
                aria-pressed={isSelected}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleManga(manga.id); } }}
                className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-lumina-primary ring-2 ring-lumina-primary shadow-lumina-lg'
                    : 'border-transparent shadow-lumina-sm hover:border-lumina-outline hover:shadow-lumina-md'
                }`}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-lumina-surface-alt">
                  {manga.cover_image_url ? (
                    <img
                      src={`${API_URL}${manga.cover_image_url}`}
                      alt={manga.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lumina-text-muted/40 text-4xl font-bold">
                      📚
                    </div>
                  )}
                </div>

                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-lumina-primary text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lumina-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4">
                  <h3 className="font-inter text-sm font-semibold text-white line-clamp-2">{manga.title}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty search result */}
        {!loading && filteredMangas.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-lumina-outline/60 p-12 text-center mb-10">
            <p className="font-jakarta text-lumina-text-muted italic">{searchTerm ? 'No manga matches your search' : 'No manga available'}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-lumina-outline/50 backdrop-blur-sm py-5 px-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={selectedMangas.length !== 4 || saving}
              className={`w-full font-inter font-semibold text-lg py-4 rounded-xl transition-colors duration-200 shadow-lumina-sm ${
                selectedMangas.length === 4 && !saving
                  ? 'bg-lumina-primary hover:bg-lumina-primary-light text-white'
                  : 'bg-lumina-surface-alt text-lumina-text-muted cursor-not-allowed'
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
