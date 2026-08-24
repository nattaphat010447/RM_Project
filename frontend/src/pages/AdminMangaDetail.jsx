import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authFetch } from '../api';
import { getImageUrl } from '../utils/image';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const NAV_ITEMS = [
  { title: 'Dashboard', path: '/admin/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h5v6H4V5zm10 0a1 1 0 011-1h5v6h-6V4zM4 14a1 1 0 011-1h5v6H5a1 1 0 01-1-1v-5zm10-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5v-6z" /> },
  { title: 'Rentals', path: '/admin/orders', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" /> },
  { title: 'Members', path: '/admin/members', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { title: 'Books', path: '/admin/mangas', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" /> },
  { title: 'History', path: '/admin/history', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { title: 'A/B Testing', path: '/admin/ab-testing', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
  { title: 'ML Training', path: '/admin/ml-training', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
];

const AdminMangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manga, setManga] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState('');
  const [rentDays, setRentDays] = useState(7);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (id === 'new') return;

    fetch(`${API_URL}/api/mangas/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Manga not found.' : 'Failed to load manga.');
        return res.json();
      })
      .then(data => {
        setManga(data);
        const availableCopies = data.copies?.filter(c => c.status === 'AVAILABLE') || [];
        if (availableCopies.length > 0) setSelectedCopy(availableCopies[0].id);
      })
      .catch(err => {
        console.error(err);
        setLoadError(err.message);
      });
  }, [id, API_URL]);

  const handleSearchUser = async () => {
    if (searchUserQuery.length < 2) {
      alert("Please enter at least 2 characters"); return;
    }
    try {
      const response = await authFetch(`${API_URL}/api/admin/customers/search/?q=${encodeURIComponent(searchUserQuery)}`);
      const data = await response.json();
      setUserResults(data);
      if (data.length === 0) alert("No customer found");
    } catch (err) { console.error(err); }
  };

  const handleCheckout = async () => {
    if (!selectedUser) { alert("Please select a customer first"); return; }
    if (!selectedCopy) { alert("Please select an available copy"); return; }

    const days = parseInt(rentDays, 10);
    if (!days || days < 1) { alert("Please enter a valid number of rental days (minimum 1)."); return; }

    if (isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const response = await authFetch(`${API_URL}/api/admin/manual-checkout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          copy_id: parseInt(selectedCopy),
          rent_days: days
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("In-store rental created successfully!");
        navigate('/admin/orders');
      } else {
        alert("Unable to save record: " + (data.error || "Invalid data"));
      }
    } catch (err) {
      alert("System error: " + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-lumina-surface flex flex-col items-center justify-center gap-5 px-4">
        <p className="font-jakarta font-semibold text-status-overdue">{loadError}</p>
        <button onClick={() => navigate('/admin/mangas')} className="border border-lumina-outline/60 hover:bg-white text-lumina-text font-inter font-semibold py-2.5 px-6 rounded-lg transition-colors">
          Back to Mangas
        </button>
      </div>
    );
  }

  if (!manga) return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading Manga...</div>;

  const availableCopies = manga.copies?.filter(c => c.status === 'AVAILABLE') || [];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-lumina-surface-alt border-r border-lumina-outline/40 p-4">
      <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-3 px-2 pt-2 pb-6 text-left w-full">
        <div className="w-10 h-10 rounded-full bg-lumina-primary flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>
        <div className="min-w-0">
          <h1 className="font-jakarta font-bold text-lg text-lumina-primary truncate">MangaAdmin</h1>
          <p className="font-inter text-xs text-lumina-text-muted truncate">Central Management</p>
        </div>
      </button>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.path === '/admin/mangas';
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-inter text-sm transition-colors duration-200 text-left ${isActive ? 'bg-lumina-primary-soft text-lumina-primary font-semibold' : 'text-lumina-text-muted hover:bg-white hover:text-lumina-text'}`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">{item.icon}</svg>
              {item.title}
            </button>
          );
        })}
      </nav>

      <div className="pt-4 mt-4 border-t border-lumina-outline/40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-inter text-sm text-lumina-text-muted hover:bg-white hover:text-status-overdue transition-colors duration-200 w-full text-left"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
          Back to Storefront
        </button>
      </div>
    </div>
  );

const inputClass = "w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow";
const labelClass = "block font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2";

return (
  <div className="min-h-screen bg-lumina-surface">

    <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 z-40">
      {sidebarContent}
    </aside>

    {sidebarOpen && (
      <div className="md:hidden fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative w-64 max-w-[80vw] h-full shadow-lumina-lg">
          {sidebarContent}
        </div>
      </div>
    )}

    <main className="md:ml-64 min-h-screen p-4 md:p-8 lg:p-10">

      <header className="flex justify-between items-start mb-6 gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/mangas"
            className="inline-flex items-center gap-1.5 font-inter text-sm text-lumina-text-muted hover:text-lumina-primary transition-colors mb-2"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Catalog
          </Link>

          <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text truncate">
            {manga.title}
          </h2>
        </div>

        <div className="flex items-start gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <Link
            to={`/admin/mangas/edit/${manga.id}`}
            className="hidden sm:inline-flex border border-lumina-primary/60 text-lumina-primary hover:bg-lumina-primary-soft font-inter text-sm font-semibold py-2.5 px-5 rounded-full transition-colors whitespace-nowrap"
          >
            Edit Manga
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-5 md:p-7 mb-6 flex flex-col sm:flex-row gap-5 md:gap-7">

        <img
          src={getImageUrl(manga.cover_image_url)}
          alt={manga.title}
          className="w-40 sm:w-44 self-start object-cover rounded-xl shadow-lumina-md border border-lumina-outline/40 bg-lumina-surface-alt"
        />

        <div className="flex flex-col min-w-0 py-1">

          <span className="w-fit inline-flex bg-lumina-primary-soft text-lumina-primary font-inter text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Manga Details (Admin)
          </span>

          <dl className="space-y-2 font-inter text-sm">

            <div className="flex gap-2">
              <dt className="text-lumina-text-muted shrink-0 w-28">
                Author
              </dt>
              <dd className="text-lumina-text font-medium">
                {manga.author}
              </dd>
            </div>

            <div className="flex gap-2">
              <dt className="text-lumina-text-muted shrink-0 w-28">
                Genre
              </dt>
              <dd className="text-lumina-text font-medium">
                {manga.genre}
              </dd>
            </div>

            <div className="flex gap-2">
              <dt className="text-lumina-text-muted shrink-0 w-28">
                Available Copies
              </dt>
              <dd className="text-status-available font-semibold">
                {availableCopies.length} of {manga.copies?.length || 0}
              </dd>
            </div>

          </dl>

          {/* Description จาก origin/main */}
          {manga.description && (
            <div className="mt-4">
              <dt className="font-inter text-sm text-lumina-text-muted mb-1">
                Description
              </dt>
              <dd className="font-inter text-sm text-lumina-text leading-relaxed max-w-2xl">
                {manga.description}
              </dd>
            </div>
          )}

          <p className="mt-auto pt-4 font-jakarta font-extrabold text-2xl text-lumina-primary leading-none">
            {manga.rental_price_per_day}
            {" "}THB
            <span className="font-inter text-sm font-semibold text-lumina-text-muted">
              {" "} / day
            </span>
          </p>

        </div>
      </div>

        <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-5 md:p-7">
          <h3 className="font-jakarta font-bold text-xl text-lumina-text mb-1">Rent Manga for Customer</h3>
          <p className="font-jakarta text-sm text-lumina-text-muted mb-5">Search customer by name or email.</p>

          {!selectedUser && (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Type to search..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                className={`${inputClass} flex-1`}
              />
              <button onClick={handleSearchUser} className="bg-lumina-primary hover:bg-lumina-primary-light text-white px-6 py-3 rounded-lg font-inter text-sm font-semibold shadow-lumina-sm transition-colors whitespace-nowrap">
                Search
              </button>
            </div>
          )}

          {userResults.length > 0 && !selectedUser && (
            <div className="border border-lumina-outline/50 rounded-xl p-4 mt-4 animate-fade-in">
              <p className="font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2">Select customer:</p>
              <div className="divide-y divide-lumina-outline/30">
                {userResults.map(user => (
                  <div key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-lumina-surface-alt/60 -mx-2 px-2 py-2.5 rounded-lg flex flex-wrap justify-between gap-x-4 transition-colors">
                    <span className="font-jakarta font-semibold text-sm text-lumina-text">{user.full_name}</span>
                    <span className="font-inter text-sm text-lumina-text-muted">{user.email} · {user.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="bg-lumina-surface-alt rounded-xl p-5 md:p-6 mt-4 animate-fade-in">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
                <p className="font-jakarta font-semibold text-lumina-text">Processing for: <span className="text-lumina-primary">{selectedUser.full_name}</span></p>
                <button onClick={() => setSelectedUser(null)} className="font-inter text-sm font-semibold text-lumina-primary hover:underline">Change customer</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="sm:col-span-2">
                  <label htmlFor="rent-copy" className={labelClass}>Select copy</label>
                  <select
                    id="rent-copy"
                    value={selectedCopy}
                    onChange={(e) => setSelectedCopy(e.target.value)}
                    className={inputClass}
                  >
                    {availableCopies.length === 0 ? <option value="">No copies available</option> :
                      availableCopies.map(c => <option key={c.id} value={c.id}>{c.serial_no}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label htmlFor="rent-days" className={labelClass}>Number of days</label>
                  <input
                    id="rent-days"
                    type="number"
                    min="1"
                    value={rentDays}
                    onChange={(e) => setRentDays(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={availableCopies.length === 0 || isCheckingOut}
                className={`w-full text-white font-inter font-semibold py-3.5 rounded-lg transition-colors shadow-lumina-sm ${(availableCopies.length === 0 || isCheckingOut) ? 'bg-lumina-primary-light opacity-70 cursor-not-allowed' : 'bg-lumina-primary hover:bg-lumina-primary-light'}`}
              >
                {isCheckingOut ? 'Processing...' : 'Confirm In-Store Rental'}
              </button>
            </div>
          )}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: scale(1); } }
        `}} />
      </main>

    </div>
  );
};

export default AdminMangaDetail;
