import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../api';
import { getImageUrl } from '../utils/image';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const MangaCard = ({ manga, renderStars }) => (
  <div className="bg-white rounded-xl shadow-lumina-sm overflow-hidden transform hover:-translate-y-1 hover:shadow-lumina-lg transition-all duration-200 flex flex-col">
    <Link to={`/manga/${manga.id}`} className="flex-grow flex flex-col">
      <img
        src={getImageUrl(manga.cover_image_url)}
        alt={manga.title}
        className="w-full h-72 object-cover"
      />
      <div className="p-4 flex-grow">
        <h3 className="font-jakarta text-lg font-semibold text-lumina-text truncate">{manga.title}</h3>
        <p className="font-inter text-sm text-lumina-text-muted mt-1">{manga.genre}</p>
        {manga.explanation && (
          <p className="font-inter text-xs text-lumina-primary mt-2 italic border-l-2 border-lumina-primary/40 pl-2">
            {manga.explanation}
          </p>
        )}
      </div>
      <div className="mt-auto flex justify-between items-end border-t border-lumina-outline/50 pt-3 px-4 pb-3">
        <div className="flex text-amber-400 text-sm" aria-label={`${manga.avg_rating || 0} out of 5 stars`}>
          {renderStars(manga.avg_rating)}
        </div>
        <span className="font-inter text-xs font-semibold text-lumina-text-muted bg-lumina-surface-alt px-2 py-1 rounded-lg">
          Sold {manga.sold_count || 0}
        </span>
      </div>
    </Link>
  </div>
);

const ForYou = () => {
  const [mangas, setMangas] = useState([]);
  const [popularFill, setPopularFill] = useState([]);
  const [showPopular, setShowPopular] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPreferences, setHasPreferences] = useState(false);

  const renderStars = (rating) => {
    const num = Math.round(rating || 0);
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError("Please log in to see your personalized recommendations.");
          setLoading(false);
          return;
        }

        const response = await authFetch(`${API_URL}/api/recommendations/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        setMangas(data.recommendations || []);
        setPopularFill(data.popular_fill || []);
        setHasPreferences(data.has_preferences || false);
        setLoading(false);
      } catch (err) {
        setError("Unable to load recommendations. Please try again.");
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-lumina-surface">
        <div className="bg-white rounded-2xl shadow-lumina-sm px-10 py-8 flex flex-col items-center gap-4">
          <svg className="animate-spin w-10 h-10 text-lumina-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
          <p className="font-jakarta font-semibold text-lg text-lumina-primary">Generating recommendations from MBRS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-lumina-surface">
        <div className="text-center font-inter text-base text-red-600 font-semibold p-6 bg-white rounded-xl border border-red-200 shadow-lumina-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lumina-surface py-12 px-6">
      <h2 className="font-jakarta text-3xl md:text-4xl font-extrabold tracking-tight text-lumina-text mb-2 text-center">FOR YOU</h2>
      <p className="text-center font-inter text-lumina-text-muted mb-10">Recommended manga for you</p>

      {!hasPreferences && (
        <div className="max-w-2xl mx-auto mb-8 p-6 bg-lumina-primary-soft border border-lumina-primary/20 rounded-2xl">
          <h3 className="font-jakarta text-lg font-semibold text-lumina-text mb-2">Set Up Your Preferences</h3>
          <p className="font-inter text-sm text-lumina-text-muted mb-4">
            Select 4 manga you enjoy to get tailored recommendations.
          </p>
          <Link
            to="/onboarding"
            className="inline-block bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-2.5 px-6 rounded-full transition-colors duration-150 shadow-lumina-sm"
          >
            Choose Your Preferences
          </Link>
        </div>
      )}

      {mangas.length === 0 && popularFill.length === 0 ? (
        <div className="text-center font-jakarta text-lumina-text mt-10 text-lg p-8 border-2 border-dashed border-lumina-outline rounded-xl max-w-2xl mx-auto">
          No recommendations yet. <br/> Try renting or adding manga to your cart first!
        </div>
      ) : (
        <>
          {mangas.length > 0 && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {mangas.map(manga => (
                <MangaCard key={manga.id} manga={manga} renderStars={renderStars} />
              ))}
            </div>
          )}

          {mangas.length === 0 && (
            <div className="text-center font-jakarta text-lumina-text-muted mt-6 text-base">
              No direct matches found for your preferences yet.
            </div>
          )}

          {popularFill.length > 0 && !showPopular && (
            <div className="text-center mt-10">
              <button
                onClick={() => setShowPopular(true)}
                className="bg-white border border-lumina-outline text-lumina-text-muted font-inter font-semibold py-2.5 px-8 rounded-full hover:bg-lumina-surface transition-colors duration-150 shadow-lumina-sm"
              >
                Show {popularFill.length} more popular manga
              </button>
            </div>
          )}

          {showPopular && (
            <>
              <div className="flex items-center gap-4 max-w-6xl mx-auto mt-12 mb-6">
                <div className="flex-1 h-px bg-lumina-outline" />
                <p className="font-inter text-sm text-lumina-text-muted whitespace-nowrap">Popular manga</p>
                <div className="flex-1 h-px bg-lumina-outline" />
              </div>
              <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {popularFill.map(manga => (
                  <MangaCard key={manga.id} manga={manga} renderStars={renderStars} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ForYou;
