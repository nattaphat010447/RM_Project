import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authFetch } from '../api';

const AdminMangaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    title: '', author: '', genre: '', description: '', rental_price_per_day: '', serial_numbers: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [currentImage, setCurrentImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadError, setLoadError] = useState(null);

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
            description: data.description || '',
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
    dataToSend.append('description', formData.description);
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
    } catch (err) {
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
    } catch (err) { alert("System error"); }
  };

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center gap-4">
        <p className="text-brand-primary font-bold">{loadError}</p>
        <button onClick={() => navigate('/admin/mangas')} className="border px-6 py-2 rounded font-bold hover:bg-brand-light">
          Back to Mangas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light p-4 flex justify-center items-center">
      <div className="w-full max-w-3xl bg-brand-light rounded-3xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Manga' : 'Add New Manga'}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Title *</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded px-3 py-2 shadow-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Author</label>
              <input type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full rounded px-3 py-2 shadow-md" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Genre</label>
              <input type="text" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className="w-full rounded px-3 py-2 shadow-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Synopsis (Description)</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full rounded px-3 py-2 shadow-md resize-none"
              placeholder="Enter manga synopsis..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Cover Image (select new file to replace)</label>
            <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} className="w-full rounded px-3 py-2 shadow-md" />
          </div>

          {isEditMode && currentImage && !coverFile && (
            <div className="my-2">
              <p className="text-sm text-brand-primary mb-1">Current cover:</p>
              <img src={getImageUrl(currentImage)} alt="Current Cover" className="w-24 h-36 object-cover rounded shadow-md" />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">Rental Price per Day (THB) *</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.rental_price_per_day}
              onChange={e => setFormData({...formData, rental_price_per_day: e.target.value})}
              className="w-full rounded px-3 py-2 shadow-md"
            />
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-sm font-bold mb-1">Book Copies (Serial No.)</label>
              <input type="text" placeholder="Separate with commas, e.g. OP-01, OP-02" value={formData.serial_numbers} onChange={e => setFormData({...formData, serial_numbers: e.target.value})} className="w-full rounded px-3 py-2 shadow-md" />
            </div>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="border px-6 py-2 rounded font-bold hover:bg-brand-light">← Back</button>
            <div className="flex gap-4">
              {isEditMode && (
                <button type="button" onClick={handleDelete} className="bg-brand-accent text-brand-light px-6 py-2 rounded font-bold hover:bg-brand-primary transition">
                  Delete Manga
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-brand-light px-6 py-2 rounded font-bold transition ${isSubmitting ? 'bg-brand-primary opacity-70 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary'}`}
              >
                {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Manga')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AdminMangaForm;
