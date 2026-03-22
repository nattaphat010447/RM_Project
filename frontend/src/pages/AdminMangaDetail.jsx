import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const AdminMangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manga, setManga] = useState(null);
  
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState('');
  const [rentDays, setRentDays] = useState(7);

  useEffect(() => {
    if (id === 'new') return;

    fetch(`${API_URL}/api/mangas/${id}/`)
      .then(res => res.json())
      .then(data => {
        setManga(data);
        const availableCopies = data.copies?.filter(c => c.status === 'AVAILABLE') || [];
        if (availableCopies.length > 0) setSelectedCopy(availableCopies[0].id);
      })
      .catch(err => console.error(err));
  }, [id, API_URL]);

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

  const handleSearchUser = async () => {
    if (searchUserQuery.length < 2) {
      alert("Please enter at least 2 characters"); return;
    }
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/customers/search/?q=${searchUserQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUserResults(data);
      if(data.length === 0) alert("No customer found");
    } catch (err) { console.error(err); }
  };

  const handleCheckout = async () => {
    if (!selectedUser) { alert("Please select a customer first"); return; }
    if (!selectedCopy) { alert("Please select an available copy"); return; }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/manual-checkout/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          copy_id: parseInt(selectedCopy),
          rent_days: parseInt(rentDays)
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
    }
  };

  if (!manga) return <div className="min-h-screen bg-brand-light flex justify-center items-center">Loading...</div>;

  const availableCopies = manga.copies?.filter(c => c.status === 'AVAILABLE') || [];

  return (
    <div className="min-h-screen bg-brand-light p-4 flex justify-center">
      <div className="w-full max-w-5xl bg-brand-light rounded-3xl shadow-xl p-8 relative h-fit">
        
        <div className="flex justify-between items-start mb-8 border-b border-brand-light pb-8">
          <div className="flex gap-8">
            <button onClick={() => navigate('/admin/mangas')} className="text-brand-primary hover:text-brand-primary mt-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            
            <img 
              src={getImageUrl(manga.cover_image_url)} 
              alt={manga.title} 
              className="w-48 h-auto object-cover rounded-lg shadow-md border border-brand-secondary"
            />
            
            <div className="pt-2">
              <h2 className="text-xl text-brand-primary mb-1">Manga Details (Admin)</h2>
              <h1 className="text-3xl font-normal text-brand-primary mb-4">{manga.title}</h1>
              <p className="text-sm text-brand-primary mb-2">Author: {manga.author}</p>
              <p className="text-sm text-brand-primary mb-4">Genre: {manga.genre}</p>
              <p className="text-sm font-bold text-brand-primary">Rental Price: {manga.rental_price_per_day} THB/day</p>
            </div>
          </div>
          <Link to={`/admin/mangas/edit/${manga.id}`} className="text-brand-accent border border-brand-secondary rounded-full px-6 py-2 hover:bg-brand-light transition text-sm">
            Edit Manga
          </Link>
        </div>

        <div>
          <h2 className="text-2xl font-normal text-brand-primary mb-2">Rent Manga for Customer</h2>
          <p className="text-sm text-brand-primary mb-4">Search customer (name, email)</p>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Type to search..." 
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="flex-1 border border-brand-secondary rounded-lg px-4 py-2 focus:outline-none focus:border-brand-accent text-brand-primary"
            />
            <button onClick={handleSearchUser} className="border border-brand-secondary text-brand-primary px-6 py-2 rounded-lg hover:bg-brand-light">Search</button>
          </div>

          {userResults.length > 0 && !selectedUser && (
            <div className="bg-brand-light border border-brand-secondary rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-brand-primary mb-2">Select customer:</p>
              {userResults.map(user => (
                <div key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-brand-light p-2 rounded border-b border-brand-light flex justify-between">
                  <span className="font-bold text-brand-primary">{user.full_name}</span>
                  <span className="text-brand-primary text-sm">{user.email} | {user.phone}</span>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="bg-brand-light border border-brand-light rounded-lg p-6 animate-fade-in mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-brand-primary">Processing for: {selectedUser.full_name}</p>
                <button onClick={() => setSelectedUser(null)} className="text-sm text-brand-secondary underline">Change customer</button>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-brand-primary mb-1">Select copy</label>
                  <select 
                    value={selectedCopy} 
                    onChange={(e) => setSelectedCopy(e.target.value)}
                    className="w-full border border-brand-secondary rounded px-3 py-2"
                  >
                    {availableCopies.length === 0 ? <option value="">No copies available</option> : 
                      availableCopies.map(c => <option key={c.id} value={c.id}>{c.serial_no}</option>)
                    }
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-brand-primary mb-1">Number of days</label>
                  <input 
                    type="number" min="1" value={rentDays} onChange={(e) => setRentDays(e.target.value)}
                    className="w-full border border-brand-secondary rounded px-3 py-2"
                  />
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={availableCopies.length === 0}
                className="w-full bg-brand-secondary hover:bg-brand-primary text-brand-light font-bold py-3 rounded-lg shadow-md disabled:bg-brand-light"
              >
                Confirm In-Store Rental
              </button>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.animate-fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}} />
    </div>
  );
};

export default AdminMangaDetail;