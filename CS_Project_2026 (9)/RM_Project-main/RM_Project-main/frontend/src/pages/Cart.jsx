import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../api';
import { getImageUrl } from '../utils/image';

const RESERVATION_STEPS = ['Reserve Online', 'Receive Confirmation', 'Pay & Collect at Store'];

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
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
      const response = await authFetch(`${API_URL}/api/cart/`);
      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
      } else {
        console.error("Failed to load cart:", response.status);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (itemId) => {
    try {
      const response = await authFetch(`${API_URL}/api/cart/remove/${itemId}/`, {
        method: 'DELETE',
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
      const price = parseFloat(item.rental_price_per_day) || 0;
      const days = parseInt(item.rent_days) || 0;
      return total + (price * days);
    }, 0).toFixed(2);
  };

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const response = await authFetch(`${API_URL}/api/cart/checkout/`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        navigate('/orders');
      } else {
        alert(data.error || "Checkout failed");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("System error.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-lumina-surface flex justify-center items-center font-jakarta text-xl font-semibold text-lumina-text-muted">Loading Cart...</div>;

  return (
    <div className="min-h-screen bg-lumina-surface pb-16 overflow-x-hidden">
      <main className="max-w-screen-xl mx-auto px-4 md:px-6 pt-10 flex flex-col gap-6">

        <header>
          <h1 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text mb-1">Reservation Cart</h1>
          <p className="font-jakarta text-base md:text-lg text-lumina-text-muted">Review your selected volumes before reserving them for in-store pickup.</p>
        </header>

        <div className="flex items-center justify-between md:justify-start md:gap-8 gap-2 bg-white p-4 md:p-5 rounded-2xl border border-lumina-outline/40 shadow-lumina-sm overflow-x-auto">
          {RESERVATION_STEPS.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && <div className="h-0.5 w-6 md:w-10 bg-lumina-outline shrink-0"></div>}
              <div className={`flex items-center gap-2 ${index === 0 ? '' : 'opacity-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-sm font-semibold shrink-0 ${index === 0 ? 'bg-lumina-primary text-white' : 'bg-lumina-surface-alt text-lumina-text-muted border border-lumina-outline/50'}`}>{index + 1}</div>
                <span className={`hidden md:inline font-inter text-sm font-semibold ${index === 0 ? 'text-lumina-primary' : 'text-lumina-text-muted'}`}>{step}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/40 p-12 md:p-16 text-center">
            <svg className="w-16 h-16 text-lumina-outline mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h2 className="font-jakarta text-2xl font-bold text-lumina-text mb-2">Your cart is empty</h2>
            <p className="font-jakarta text-lumina-text-muted mb-6">Discover manga and add them to your reservation.</p>
            <Link to="/" className="inline-block bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-3 px-8 rounded-full transition-colors duration-200 shadow-lumina-sm">
              Browse Mangas
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

            <div className="lg:col-span-8 flex flex-col gap-4">

              <div className="bg-lumina-primary text-white p-5 md:p-6 rounded-2xl flex items-start gap-4 shadow-lumina-lg">
                <svg className="w-7 h-7 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.8a1 1 0 01.3-.7l6-6A2 2 0 0021 5V3.6a.6.6 0 00-1-.43L14.35 8.8M13.5 21h-3m3 0H3V17a4 4 0 014-4h3.5m0 8v-8m0 0V9a3 3 0 00-3-3H6" />
                </svg>
                <div>
                  <h3 className="font-jakarta font-semibold text-lg mb-1">Pay at the store</h3>
                  <p className="font-jakarta text-sm opacity-90 leading-relaxed">Payment is made at the store when you pick up your reserved books. No online payment required.</p>
                </div>
              </div>

              {cartItems.map((item) => (
                <div key={item.id} className="group bg-white rounded-2xl p-4 md:p-5 flex gap-4 md:gap-5 border border-lumina-outline/40 shadow-lumina-sm hover:shadow-lumina-lg transition-all duration-300">
                  <div className="shrink-0 w-20 sm:w-24 md:w-28 aspect-[2/3] rounded-lg overflow-hidden bg-lumina-surface-alt">
                    <img
                      src={getImageUrl(item.manga_cover)}
                      alt={item.manga_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 bg-lumina-surface-alt text-lumina-text-muted px-2.5 py-1 rounded-full font-inter text-xs mb-2">
                          Copy ID: {item.serial_no}
                        </span>
                        <h3 className="font-jakarta font-semibold text-base md:text-lg text-lumina-text line-clamp-2 leading-snug">{item.manga_title}</h3>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remove ${item.manga_title} from cart`}
                        className="shrink-0 text-lumina-text-muted hover:text-status-overdue transition-colors p-1.5"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-4 gap-3">
                      <div className="inline-flex items-center bg-lumina-surface-alt rounded-lg px-3 py-1.5 border border-lumina-outline/50">
                        <span className="font-inter text-xs font-medium text-lumina-text-muted">Rent for {item.rent_days} days</span>
                      </div>
                      <div className="font-jakarta font-bold text-lg md:text-xl text-lumina-primary whitespace-nowrap">
                        ฿{(parseFloat(item.rental_price_per_day) * item.rent_days || 0).toFixed(2)}
                        <span className="font-inter text-xs text-lumina-text-muted font-normal"> / {item.rent_days} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28 bg-white rounded-2xl p-6 border border-lumina-outline/40 shadow-lumina-lg">
                <h2 className="font-jakarta font-semibold text-lg text-lumina-text mb-5 border-b border-lumina-outline/40 pb-4">Reservation Summary</h2>

                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex justify-between items-center font-jakarta text-sm">
                    <span className="text-lumina-text-muted">Total Volumes</span>
                    <span className="text-lumina-text font-semibold">{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center font-jakarta text-sm">
                    <span className="text-lumina-text-muted">Rental Period</span>
                    <span className="text-lumina-text">
                      {cartItems.length > 0 && cartItems.every(i => parseInt(i.rent_days) === parseInt(cartItems[0].rent_days))
                        ? `${cartItems[0].rent_days} Days`
                        : `${Math.min(...cartItems.map(i => parseInt(i.rent_days) || 0))}–${Math.max(...cartItems.map(i => parseInt(i.rent_days) || 0))} Days`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-lumina-outline/40 pt-4 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="font-jakarta font-semibold text-lg text-lumina-text">Estimated Total</span>
                    <div className="text-right">
                      <span className="block font-jakarta font-extrabold text-3xl text-lumina-primary leading-none">{calculateTotal()} THB</span>
                      <span className="font-inter text-xs text-lumina-text-muted mt-1 block">Due at pickup</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className={`w-full font-inter font-semibold text-sm py-4 px-6 rounded-lg transition-all duration-200 flex justify-center items-center gap-2 shadow-lumina-sm ${isCheckingOut ? 'bg-lumina-surface-alt text-lumina-text-muted cursor-not-allowed' : 'bg-lumina-primary hover:bg-lumina-primary-light text-white hover:shadow-lumina-lg'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    {isCheckingOut ? 'Processing...' : 'Confirm Reservation'}
                  </button>
                  <Link to="/" className="w-full text-center bg-transparent hover:bg-lumina-surface-alt text-lumina-primary font-inter font-semibold text-sm py-3 px-6 rounded-lg transition-colors duration-200">
                    Continue Browsing
                  </Link>
                </div>

                <div className="mt-6 flex items-start gap-2 text-lumina-text-muted">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="font-inter text-xs leading-relaxed">Reserve online now. Pay when you pick up your manga at the store.</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
