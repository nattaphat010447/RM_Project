import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import { getImageUrl } from '../utils/image';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const HERO_BG = '/images/mangas/banner.svg';

const Home = () => {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/mangas/`)
      .then(response => response.json())
      .then(data => {
        setMangas(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
        setLoading(false);
      });
  }, []);

  const featured = mangas.slice(0, 3);

  return (
    <div className="bg-lumina-surface pb-16 overflow-x-hidden">

      <header className="relative flex items-center min-h-[560px] md:min-h-[720px] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_BG}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-lumina-surface via-lumina-surface/85 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-jakarta font-extrabold tracking-tight text-4xl md:text-5xl leading-tight text-lumina-text mb-4">
                Discover your next <span className="text-lumina-primary">favorite manga.</span>
              </h1>
              <p className="font-jakarta text-lg text-lumina-text-muted max-w-lg">
                Immerse yourself in thousands of stories, from hidden gems to blockbuster hits.
                Reserve online and pick up in-store with ease.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/search"
                className="inline-block bg-lumina-primary hover:bg-lumina-primary-light text-white px-8 py-4 rounded-full font-inter font-semibold text-sm transition-colors shadow-lumina-sm"
              >
                Explore Manga
              </Link>
              <Link
                to="/popular"
                className="inline-block bg-lumina-surface-card border border-lumina-outline/60 text-lumina-text hover:bg-lumina-surface-alt px-8 py-4 rounded-full font-inter font-semibold text-sm transition-colors"
              >
                View Popular
              </Link>
            </div>
          </div>

          {!loading && featured.length > 0 && (
            <div className="hidden lg:grid grid-cols-2 gap-6 h-[500px]">
              <Link
                to={`/manga/${featured[0].id}`}
                className="col-span-1 row-span-2 relative rounded-2xl overflow-hidden shadow-lumina-lg group"
              >
                <img
                  src={getImageUrl(featured[0].cover_image_url)}
                  alt={featured[0].title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <span className="font-inter text-[10px] font-bold uppercase tracking-wide bg-status-requested text-white px-2 py-1 rounded w-fit mb-2">Featured</span>
                  <h3 className="font-jakarta font-semibold text-xl text-white line-clamp-2">{featured[0].title}</h3>
                  {featured[0].genre && (
                    <p className="font-inter text-sm text-white/80">{featured[0].genre}</p>
                  )}
                </div>
              </Link>

              {featured.slice(1, 3).map((manga) => (
                <Link
                  key={`hero-${manga.id}`}
                  to={`/manga/${manga.id}`}
                  className="col-span-1 row-span-1 relative rounded-2xl overflow-hidden shadow-lumina-sm group"
                >
                  <img
                    src={getImageUrl(manga.cover_image_url)}
                    alt={manga.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                    <h4 className="font-inter font-semibold text-sm text-white line-clamp-1">{manga.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 space-y-16">

        <section className="pt-16">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="font-jakarta font-bold text-2xl md:text-3xl text-lumina-text">Recommended for You</h2>
              <p className="font-jakarta text-lumina-text-muted mt-1">Based on your recent reading history</p>
            </div>
            <Link to="/foryou" className="font-inter text-sm font-semibold text-lumina-primary hover:underline whitespace-nowrap hidden sm:block">
              See all recommendations
            </Link>
          </div>

          {loading ? (
            <div className="text-center font-semibold text-lumina-text-muted my-20">Loading Mangas...</div>
          ) : mangas.length === 0 ? (
            <div className="text-center text-lumina-text-muted my-20 border-2 border-dashed border-lumina-outline/60 rounded-2xl p-12">
              No manga available yet. Please check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {mangas.slice(0, 3).map(manga => (
                <MangaCard key={`rec-${manga.id}`} manga={manga} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="font-jakarta font-bold text-2xl md:text-3xl text-lumina-text">Popular This Week</h2>
              <p className="font-jakarta text-lumina-text-muted mt-1">Most rented manga during the last 7 days</p>
            </div>
            <Link to="/popular" className="font-inter text-sm font-semibold text-lumina-primary hover:underline whitespace-nowrap hidden sm:block">
              See all popular
            </Link>
          </div>

          {loading ? (
            <div className="text-center font-semibold text-lumina-text-muted my-20">Loading Mangas...</div>
          ) : mangas.length > 3 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {mangas.slice(3, 6).map(manga => (
                <MangaCard key={`pop-${manga.id}`} manga={manga} />
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <footer className="mt-20 bg-lumina-surface-card border-t border-lumina-outline/40">
        <div className="max-w-screen-xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <span className="font-jakarta text-lg font-extrabold text-lumina-primary">SukiManga</span>
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-lumina-outline/50 bg-lumina-surface-alt max-w-md">
            <svg className="w-6 h-6 text-lumina-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.8a1 1 0 01.3-.7l6-6A2 2 0 0021 5V3.6a.6.6 0 00-1-.43L14.35 8.8M13.5 21h-3m3 0H3V17a4 4 0 014-4h3.5m0 8v-8m0 0V9a3 3 0 00-3-3H6" />
            </svg>
            <div>
              <h5 className="font-inter text-sm font-semibold text-lumina-text mb-1">Reserve Online — Pay at Store</h5>
              <p className="font-inter text-xs text-lumina-text-muted leading-relaxed">
                1. Reserve here&nbsp;&nbsp;·&nbsp;&nbsp;2. Get confirmation&nbsp;&nbsp;·&nbsp;&nbsp;3. Pay &amp; collect in-store
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
