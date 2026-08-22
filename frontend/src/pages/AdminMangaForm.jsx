import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const AdminMangaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '', author: '', genre: '', rental_price_per_day: '', serial_numbers: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [currentImage, setCurrentImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetch(`${API_URL}/api/mangas/${id}/`)
        .then(res => {
          if (!res.ok) throw new Error(res.status === 404 ? 'Manga not found.' : 'Failed to load manga.');
          return res.json();
        })
        .then(data => {
          setFormData({
            title: data.title, author: data.author || '', genre: data.genre || '',
            rental_price_per_day: data.rental_price_per_day, serial_numbers: ''
          });
          setCurrentImage(data.cover_image_url);
        })
        .catch(err => {
          console.error(err);
          setLoadError(err.message);
        });
    }
  }, [id, API_URL, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = parseFloat(formData.rental_price_per_day);
    if (isNaN(price) || price <= 0) {
      alert("Rental price must be greater than 0.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const dataToSend = new FormData();
    dataToSend.append('title', formData.title);
    dataToSend.append('author', formData.author);
    dataToSend.append('genre', formData.genre);
    dataToSend.append('rental_price_per_day', price);

    if (coverFile) {
      dataToSend.append('cover_image_url', coverFile);
    }

    if (!isEditMode && formData.serial_numbers) {
      const rawEntries = formData.serial_numbers.split(',').map(s => s.trim());
      const serials = rawEntries.filter(s => s.length > 0);
      const unique = [...new Set(serials)];

      const blankCount = rawEntries.length - serials.length;
      const duplicateCount = serials.length - unique.length;
      if (blankCount > 0 || duplicateCount > 0) {
        const parts = [];
        if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate serial number(s)`);
        if (blankCount > 0) parts.push(`${blankCount} empty entr${blankCount === 1 ? 'y' : 'ies'}`);
        const proceed = window.confirm(
          `${parts.join(' and ')} will be skipped, so only ${unique.length} copy(ies) will be created instead of ${rawEntries.length}. Continue?`
        );
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }

      dataToSend.append('serial_numbers', unique.join(','));
    }

    try {
      const url = isEditMode ? `${API_URL}/api/admin/mangas/${id}/` : `${API_URL}/api/admin/mangas/`;
      const response = await authFetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        body: dataToSend
      });

      if (response.ok) {
        alert("Saved successfully");
        navigate('/admin/mangas');
      } else {
        alert("An error occurred");
      }
    } catch {
      alert("System error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this manga?")) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/mangas/${id}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        navigate('/admin/mangas');
      } else {
        alert("Failed to delete manga");
      }
    } catch { alert("System error"); }
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
          <div className="relative w-64 max-w-[80vw] h-full shadow-lumina-lg">{sidebarContent}</div>
        </div>
      )}

      <main className="md:ml-64 min-h-screen p-4 md:p-8 lg:p-10">

        <header className="flex justify-between items-start mb-6 gap-4">
          <div>
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">{isEditMode ? 'Edit Manga' : 'Add New Manga'}</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">{isEditMode ? 'Update the title details and pricing.' : 'Register a new title and its book copies.'}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8 mb-6">
            <h3 className="font-jakarta font-bold text-lg text-lumina-text mb-6 pb-4 border-b border-lumina-outline/40">Title Details</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="manga-title" className={labelClass}>Title *</label>
                <input id="manga-title" type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="manga-author" className={labelClass}>Author</label>
                  <input id="manga-author" type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="manga-genre" className={labelClass}>Genre</label>
                  <input id="manga-genre" type="text" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="manga-price" className={labelClass}>Rental Price per Day (THB) *</label>
                <input
                  id="manga-price"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.rental_price_per_day}
                  onChange={e => setFormData({...formData, rental_price_per_day: e.target.value})}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8 mb-6">
            <h3 className="font-jakarta font-bold text-lg text-lumina-text mb-6 pb-4 border-b border-lumina-outline/40">Cover Image</h3>

            <div className="flex items-start gap-6">
              <div className="flex-1">
                <label htmlFor="manga-cover" className={labelClass}>Cover Image (select new file to replace)</label>
                <input
                  id="manga-cover"
                  type="file"
                  accept="image/*"
                  onChange={e => setCoverFile(e.target.files[0])}
                  className="w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-2.5 font-inter text-sm text-lumina-text-muted file:mr-4 file:rounded-md file:border-0 file:bg-lumina-primary-soft file:px-4 file:py-2 file:font-inter file:text-sm file:font-semibold file:text-lumina-primary hover:file:bg-lumina-primary/15 cursor-pointer shadow-lumina-sm"
                />
              </div>
              {isEditMode && currentImage && !coverFile && (
                <div className="shrink-0">
                  <p className="font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2">Current</p>
                  <img src={getImageUrl(currentImage)} alt="Current Cover" className="w-24 h-36 object-cover rounded-lg shadow-lumina-sm border border-lumina-outline/40" />
                </div>
              )}
            </div>
          </div>

          {!isEditMode && (
            <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8 mb-8">
              <h3 className="font-jakarta font-bold text-lg text-lumina-text mb-6 pb-4 border-b border-lumina-outline/40">Book Copies</h3>
              <label htmlFor="manga-serials" className={labelClass}>Serial Numbers</label>
              <input
                id="manga-serials"
                type="text"
                placeholder="Separate with commas, e.g. OP-01, OP-02"
                value={formData.serial_numbers}
                onChange={e => setFormData({...formData, serial_numbers: e.target.value})}
                className={inputClass}
              />
              <p className="font-inter text-xs text-lumina-text-muted mt-2">One copy will be created per serial number.</p>
            </div>
          )}

          <div className="flex justify-between items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="border border-lumina-outline/60 hover:bg-white text-lumina-text font-inter font-semibold py-2.5 px-6 rounded-lg transition-colors">
              Cancel
            </button>
            <div className="flex gap-3">
              {isEditMode && (
                <button type="button" onClick={handleDelete} className="border border-status-overdue/60 text-status-overdue hover:bg-status-overdue/10 font-inter font-semibold py-2.5 px-6 rounded-lg transition-colors">
                  Delete Manga
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-white font-inter font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-lumina-sm ${isSubmitting ? 'bg-lumina-primary-light opacity-70 cursor-not-allowed' : 'bg-lumina-primary hover:bg-lumina-primary-light'}`}
              >
                {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Manga')}
              </button>
            </div>
          </div>
        </form>

      </main>

    </div>
  );
};
export default AdminMangaForm;
