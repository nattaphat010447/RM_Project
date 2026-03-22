import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const MangaDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isAdded, setIsAdded] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [rentalDays, setRentalDays] = useState(7);

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
      })
      .catch(error => {
        console.error("Error fetching manga detail: ", error);
        setLoading(false);
      });
  }, [id, API_URL]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      navigate('/signin');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart/add/${id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rent_days: rentalDays,
          copy_id: copyId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 3000);
      } else {
        alert(data.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("System error. Please try again.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-brand-primary flex items-center justify-center text-brand-light text-2xl font-bold">Loading Manga Details...</div>;
  }

  if (!manga) {
    return <div className="min-h-screen bg-brand-primary flex items-center justify-center text-brand-light text-2xl font-bold">Manga not found!</div>;
  }

  const availableCopies = manga.copies?.filter(c => c.status === 'AVAILABLE') || [];
  const isOutOfStock = availableCopies.length === 0;

  return (
    <div className="min-h-screen bg-brand-primary pt-10 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        
        {isAdded && (
          <div className="bg-brand-light text-brand-primary px-6 py-4 rounded-md mb-6 font-bold shadow-md transition-all">
            Added "{manga.title}" (Copy: {manga.copies.find(c => c.id.toString() === copyId.toString())?.serial_no}) to the cart for {rentalDays} days successfully.
          </div>
        )}

        <div className="bg-brand-light rounded-2xl p-6 md:p-10 relative shadow-2xl flex flex-col md:flex-row gap-10">
          
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 w-10 h-10 bg-brand-light hover:bg-brand-light border border-brand-secondary rounded-full flex items-center justify-center transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="w-full md:w-2/5 mt-14 md:mt-0 flex justify-center items-start">
            <img 
              src={getImageUrl(manga.cover_image_url)} 
              alt={manga.title}  
              className="w-full max-w-sm h-auto object-cover rounded-xl shadow-md border border-brand-light"
            />
          </div>

          <div className="w-full md:w-3/5 flex flex-col pt-2 md:pt-4">
            <h1 className="text-3xl font-bold text-brand-primary mb-4">{manga.title}</h1>
            
            <div className="space-y-2 text-brand-primary mb-6">
              <p><span className="font-semibold text-brand-primary w-24 inline-block">Author:</span> {manga.author}</p>
              <p><span className="font-semibold text-brand-primary w-24 inline-block">Category:</span> {manga.genre}</p>
              <p className="pt-2">
                <span className="font-semibold text-brand-primary">Rental Price:</span> 
                <span className="font-bold text-lg text-brand-primary ml-2">{manga.rental_price_per_day} THB/day</span>
              </p>
            </div>

            <div className="space-y-5 mb-8 flex-grow">
              
              <div>
                <label className="block text-brand-primary font-semibold mb-2">Select copy to rent</label>
                <div className="relative">
                  <select 
                    value={copyId}
                    onChange={(e) => setCopyId(e.target.value)}
                    disabled={isOutOfStock}
                    className={`w-full appearance-none border border-brand-secondary rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-secondary text-brand-primary ${isOutOfStock ? 'bg-brand-light cursor-not-allowed' : 'bg-brand-light'}`}
                  >
                    {isOutOfStock ? (
                      <option value="">Out of stock (ไม่มีเล่มว่าง)</option>
                    ) : (
                      availableCopies.map(copy => (
                        <option key={copy.id} value={copy.id}>
                          Copy ID: {copy.serial_no}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brand-primary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-brand-primary font-semibold mb-2">Number of rental days</label>
                <input 
                  type="number" 
                  min="1"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(e.target.value)}
                  disabled={isOutOfStock}
                  className={`w-full border border-brand-secondary rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-secondary text-brand-primary ${isOutOfStock ? 'bg-brand-light cursor-not-allowed' : 'bg-brand-light'}`}
                />
              </div>
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full font-bold text-lg py-4 rounded-xl transition duration-200 shadow-md ${isOutOfStock ? 'bg-brand-light text-brand-primary cursor-not-allowed' : 'bg-brand-accent hover:bg-brand-accent text-brand-primary'}`}
            >
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default MangaDetail;