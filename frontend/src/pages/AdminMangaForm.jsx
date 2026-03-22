import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AdminMangaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    title: '', author: '', genre: '', rental_price_per_day: '', serial_numbers: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [currentImage, setCurrentImage] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetch(`${API_URL}/api/mangas/${id}/`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            title: data.title, author: data.author || '', genre: data.genre || '',
            rental_price_per_day: data.rental_price_per_day, serial_numbers: ''
          });
          setCurrentImage(data.cover_image_url);
        });
    }
  }, [id, API_URL, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    
    const dataToSend = new FormData();
    dataToSend.append('title', formData.title);
    dataToSend.append('author', formData.author);
    dataToSend.append('genre', formData.genre);
    dataToSend.append('rental_price_per_day', formData.rental_price_per_day);
    
    if (coverFile) {
        dataToSend.append('cover_image_url', coverFile);
    }
    
    if (!isEditMode && formData.serial_numbers) {
        dataToSend.append('serial_numbers', formData.serial_numbers);
    }

    try {
      const url = isEditMode ? `${API_URL}/api/admin/mangas/${id}/` : `${API_URL}/api/admin/mangas/`;
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: dataToSend
      });

      if (response.ok) {
        alert("Saved successfully");
        navigate('/admin/mangas');
      } else {
        alert("An error occurred");
      }
    } catch (err) { alert("System error"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this manga?")) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/mangas/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex justify-center items-center">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Manga' : 'Add New Manga'}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Title *</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Author</label>
              <input type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Genre</label>
              <input type="text" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">Cover Image (select new file to replace)</label>
            <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} className="w-full border rounded px-3 py-2" />
          </div>
          
          {isEditMode && currentImage && !coverFile && (
            <div className="my-2">
              <p className="text-sm text-gray-500 mb-1">Current cover:</p>
              <img src={getImageUrl(currentImage)} alt="Current Cover" className="w-24 h-36 object-cover rounded border" />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">Rental Price per Day (THB) *</label>
            <input type="number" required value={formData.rental_price_per_day} onChange={e => setFormData({...formData, rental_price_per_day: e.target.value})} className="w-full border rounded px-3 py-2" />
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-sm font-bold mb-1">Book Copies (Serial No.)</label>
              <input type="text" placeholder="Separate with commas, e.g. OP-01, OP-02" value={formData.serial_numbers} onChange={e => setFormData({...formData, serial_numbers: e.target.value})} className="w-full border rounded px-3 py-2" />
            </div>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="border px-6 py-2 rounded font-bold hover:bg-gray-50">← Back</button>
            <div className="flex gap-4">
              {isEditMode && (
                <button type="button" onClick={handleDelete} className="bg-red-500 text-white px-6 py-2 rounded font-bold hover:bg-red-600 transition">
                  Delete Manga
                </button>
              )}
              <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black transition">
                {isEditMode ? 'Save Changes' : 'Create Manga'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AdminMangaForm;