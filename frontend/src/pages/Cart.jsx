import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Please log in to view your cart.");
      navigate('/signin');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [API_URL, navigate]);

  const handleRemove = async (itemId) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/cart/remove/${itemId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setCartItems(cartItems.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.rental_price_per_day) * item.rent_days);
    }, 0).toFixed(2);
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/cart/checkout/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        navigate('/orders');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("System error.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#2d116c] flex justify-center items-center text-white text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-indigo-900 mb-8 uppercase tracking-wider border-b-2 border-indigo-100 pb-4">My Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-500 mb-6">Your cart is empty</h2>
            <Link to="/" className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 px-8 rounded-full transition duration-200">
              Browse Mangas
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-2/3 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row items-center gap-6 relative">
                  <img src={item.manga_cover} alt={item.manga_title} className="w-24 h-32 object-cover rounded-lg shadow-sm" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-800">{item.manga_title}</h3>
                    <p className="text-sm text-gray-500 mt-1">Copy ID: {item.serial_no}</p>
                    <div className="mt-3 inline-block bg-purple-100 text-purple-800 text-sm font-semibold px-3 py-1 rounded-full">
                      Rent for {item.rent_days} days
                    </div>
                  </div>
                  <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-3">
                    <span className="text-2xl font-black text-indigo-600">
                      {(parseFloat(item.rental_price_per_day) * item.rent_days).toFixed(2)} ฿
                    </span>
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="text-red-500 hover:text-red-700 font-semibold text-sm transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border-t-4 border-indigo-900">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>
                <div className="flex justify-between text-gray-600 mb-3">
                  <span>Total Items</span>
                  <span>{cartItems.length}</span>
                </div>
                <div className="flex justify-between font-black text-2xl text-gray-900 mt-6 pt-6 border-t border-gray-100">
                  <span>Total</span>
                  <span>{calculateTotal()} ฿</span>
                </div>
                <button 
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-lg py-4 rounded-xl mt-8 transition duration-200 shadow-md"
                  onClick={handleCheckout}
                >
                  CONFIRM ORDER
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;