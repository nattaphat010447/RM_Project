import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { authFetch } from '../api';
import { getImageUrl } from '../utils/image';
import MangaCard from '../components/MangaCard';
import StarRating from '../components/StarRating';
import StatusBadge from '../components/StatusBadge';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const RESERVATION_STEPS = ['1. Reserve Online', '2. Receive Confirmation', '3. Pay & Collect at Store'];

const MangaDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isAdded, setIsAdded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [rentalDays, setRentalDays] = useState(7);

  const [allMangas, setAllMangas] = useState([]);

  // Track CLICK behavior
  const logBehavior = async (eventType, additionalData = {}) => {
    const token = localStorage.getItem('access_token');
    if (!token) return; // Only track for logged-in users

    try {
      await authFetch(`${API_URL}/api/behaviors/log/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manga_id: id,
          event_type: eventType,
          source: location.state?.source || 'DIRECT',
          ...additionalData
        })
      });
    } catch (error) {
      // Silent fail — don't block user experience
      console.debug('Behavior log failed:', error);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/${id}/`)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        setManga(data);
        setLoading(false);
        const availableCopies = data.copies?.filter(c => c.status === 'AVAILABLE') || [];
        if (availableCopies.length > 0) {
          setCopyId(availableCopies[0].id);
        }

        // Log CLICK behavior (non-blocking)
        logBehavior('CLICK');
      })
      .catch(error => {
        console.error("Error fetching manga detail: ", error);
        setLoading(false);
      });
  }, [id, API_URL]);

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(res => res.json())
      .then(data => setAllMangas(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching related manga: ', err));
  }, []);

  const relatedMangas = useMemo(() => {
    if (!manga || !manga.genre) return [];
    const currentGenres = manga.genre.split('/').map(g => g.trim());
    return allMangas
      .filter(m =>
        m.id !== manga.id &&
        m.genre &&
        m.genre.split('/').map(g => g.trim()).some(g => currentGenres.includes(g))
      )
      .slice(0, 6);
  }, [manga, allMangas]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    const days = parseInt(rentalDays, 10);
    if (!days || days < 1) {
      alert("Please enter a valid number of rental days (minimum 1).");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await authFetch(`${API_URL}/api/cart/add/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rent_days: days, copy_id: copyId })
      });

      const data = await response.json();

      if (response.ok) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 3000);

        // Log ADD_CART behavior (non-blocking)
        logBehavior('ADD_CART', { rent_days: days });
      } else {
        alert(data.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("System error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta text-xl font-semibold text-lumina-text-muted">Loading Manga Details...</div>;
  }

  if (!manga) {
    return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta text-xl font-semibold text-lumina-text-muted">Manga not found!</div>;
  }

  const availableCopies = manga.copies?.filter(c => c.status === 'AVAILABLE') || [];
  const isOutOfStock = availableCopies.length === 0;
  const genrePills = manga.genre
    ? manga.genre.split('/').map(g => g.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-lumina-surface pb-16 overflow-x-hidden">
      <main className="max-w-screen-xl mx-auto px-4 md:px-6 pt-8">

        <div className="flex items-center gap-3 mb-8 min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="shrink-0 w-10 h-10 rounded-full border border-lumina-outline/60 bg-white text-lumina-text hover:border-lumina-primary hover:text-lumina-primary transition-colors flex items-center justify-center"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <nav className="font-inter text-sm text-lumina-text-muted truncate" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-lumina-primary transition-colors">Home</Link>
            <span className="mx-2 text-lumina-outline">›</span>
            <Link to="/search" className="hover:text-lumina-primary transition-colors">Discover</Link>
            <span className="mx-2 text-lumina-outline">›</span>
            <span className="text-lumina-text font-medium">{manga.title}</span>
          </nav>
        </div>

        {isAdded && (
          <div className="bg-lumina-primary-soft text-lumina-primary px-6 py-4 rounded-xl mb-6 font-inter text-sm font-semibold shadow-lumina-sm transition-all">
            Added "{manga.title}" (Copy: {manga.copies.find(c => c.id.toString() === copyId.toString())?.serial_no}) to the cart for {parseInt(rentalDays, 10)} days successfully.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">

          <div className="md:col-span-3 flex justify-center md:justify-start">
            <div className="w-full max-w-[300px] aspect-[2/3] rounded-2xl shadow-lumina-lg overflow-hidden bg-lumina-surface-alt relative">
              <img
                src={getImageUrl(manga.cover_image_url)}
                alt={manga.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <StatusBadge
                  status={isOutOfStock ? 'unavailable' : 'AVAILABLE'}
                  label={isOutOfStock ? 'Unavailable' : 'Available'}
                  className="shadow-sm backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-5 lg:col-span-6 flex flex-col gap-6">
            <div>
              <h1 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text mb-1">{manga.title}</h1>
              <p className="font-jakarta text-lg text-lumina-text-muted mb-4">
                By <span className="font-semibold text-lumina-primary">{manga.author}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
                <StarRating rating={manga.avg_rating} size="md" />
                <span className="font-inter text-xs text-lumina-text-muted">{Number(manga.avg_rating || 0).toFixed(1)} rating</span>
                <span className="text-lumina-outline">•</span>
                <span className="font-inter text-xs text-lumina-text-muted">Sold {manga.sold_count || 0}</span>
              </div>

              {genrePills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genrePills.map(genre => (
                    <span key={genre} className="px-3 py-1 bg-lumina-surface-alt rounded-full font-inter text-xs font-medium text-lumina-text-muted">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {manga.description && (
              <div>
                <h2 className="font-jakarta font-semibold text-lg text-lumina-text mb-2">Synopsis</h2>
                <p className="font-jakarta text-base text-lumina-text-muted leading-relaxed whitespace-pre-line">
                  {manga.description}
                </p>
              </div>
            )}
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            <div className="md:sticky md:top-28 bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/40 p-6 flex flex-col gap-5">

              <div className="flex justify-between items-end gap-3 border-b border-lumina-outline/40 pb-4">
                <div>
                  <span className="block font-inter text-xs text-lumina-text-muted mb-1">Rental Fee</span>
                  <span className="font-jakarta font-bold text-2xl text-lumina-primary">
                    ฿{manga.rental_price_per_day}<span className="font-inter text-sm text-lumina-text-muted font-normal">/day</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-inter text-xs text-lumina-text-muted mb-1">Availability</span>
                  <span className={`font-inter text-sm font-semibold ${isOutOfStock ? 'text-status-overdue' : 'text-status-available'}`}>
                    {isOutOfStock ? 'Unavailable' : `${availableCopies.length} copies`}
                  </span>
                </div>
              </div>

              <div className="bg-lumina-surface-alt rounded-lg p-4">
                <p className="font-inter text-xs font-semibold text-lumina-text mb-2">Reservation Process:</p>
                <ul className="space-y-1.5">
                  {RESERVATION_STEPS.map((step, index) => (
                    <li key={step} className="flex items-center gap-2 font-inter text-xs text-lumina-text-muted">
                      <svg className="w-3.5 h-3.5 text-lumina-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {index === 0 && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        {index === 1 && <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                        {index === 2 && <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.8a1 1 0 01.3-.7l6-6A2 2 0 0021 5V3.6a.6.6 0 00-1-.43L14.35 8.8M13.5 21h-3m3 0H3V17a4 4 0 014-4h3.5m0 8v-8m0 0V9a3 3 0 00-3-3H6" />}
                      </svg>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4">

                <div>
                  <label htmlFor="copy-select" className="block font-inter text-sm font-medium text-lumina-text mb-2">Select copy to rent</label>
                  <div className="relative">
                    <select
                      id="copy-select"
                      value={copyId}
                      onChange={(e) => setCopyId(e.target.value)}
                      disabled={isOutOfStock}
                      className={`w-full appearance-none rounded-lg border px-4 py-3 pr-10 font-inter text-sm text-lumina-text focus:outline-none focus:ring-1 focus:ring-lumina-primary focus:border-lumina-primary transition-shadow ${isOutOfStock ? 'bg-lumina-surface-alt border-lumina-outline/40 cursor-not-allowed text-lumina-text-muted' : 'bg-white border-lumina-outline/60'}`}
                    >
                      {isOutOfStock ? (
                        <option value="">Out of stock</option>
                      ) : (
                        availableCopies.map(copy => (
                          <option key={copy.id} value={copy.id}>
                            Copy ID: {copy.serial_no}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-lumina-text-muted">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="rental-days" className="block font-inter text-sm font-medium text-lumina-text mb-2">Number of rental days</label>
                  <input
                    id="rental-days"
                    type="number"
                    min="1"
                    value={rentalDays}
                    onChange={(e) => setRentalDays(e.target.value)}
                    disabled={isOutOfStock}
                    className={`w-full rounded-lg border px-4 py-3 font-inter text-sm focus:outline-none focus:ring-1 focus:ring-lumina-primary focus:border-lumina-primary transition-shadow ${isOutOfStock ? 'bg-lumina-surface-alt border-lumina-outline/40 cursor-not-allowed text-lumina-text-muted' : 'bg-white border-lumina-outline/60 text-lumina-text'}`}
                  />
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isSubmitting}
                  className={`w-full font-inter font-semibold text-sm py-3.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${(isOutOfStock || isSubmitting) ? 'bg-lumina-surface-alt text-lumina-text-muted cursor-not-allowed' : 'bg-lumina-primary hover:bg-lumina-primary-light text-white shadow-lumina-sm'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  {isOutOfStock ? 'Out of Stock' : isSubmitting ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>

              <p className="font-inter text-xs text-lumina-text-muted text-center flex items-start justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Payment is made at the store upon pickup.
              </p>
            </div>
          </div>

        </div>

        {relatedMangas.length > 0 && (
          <section className="mt-16 pt-10 border-t border-lumina-outline/50">
            <div className="flex items-end justify-between mb-8 gap-4">
              <h3 className="font-jakarta font-bold text-2xl text-lumina-text">You Might Also Like</h3>
              <Link to="/search" className="hidden sm:flex items-center gap-1 font-inter text-sm font-semibold text-lumina-primary hover:underline whitespace-nowrap">
                View More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
              {relatedMangas.map(m => (
                <MangaCard key={`related-${m.id}`} manga={m} />
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default MangaDetail;
