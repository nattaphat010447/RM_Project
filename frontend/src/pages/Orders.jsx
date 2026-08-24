import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authFetch } from '../api';
import StarRating from '../components/StarRating';
import StatusBadge from '../components/StatusBadge';

const RESERVATION_STEPS = ['Reserve Online', 'Receive Confirmation', 'Pay & Collect at Store'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const calculateRemainingDays = (dueDateStr) => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    if (isNaN(dueDate.getTime())) return null;
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleRateManga = async (mangaId, rating) => {
    try {
      const response = await authFetch(`${API_URL}/api/mangas/${mangaId}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      const data = await response.json();
      if (!response.ok) alert(data.error);
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    authFetch(`${API_URL}/api/orders/`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load orders.');
        return res.json();
      })
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [navigate, API_URL]);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this rental request?")) return;
    if (cancellingId) return;

    setCancellingId(orderId);
    try {
      const response = await authFetch(`${API_URL}/api/orders/${orderId}/cancel/`, {
        method: 'POST',
      });

      if (response.ok) {
        alert("Request cancelled successfully. The book has been returned to inventory.");
        setOrders(orders.map(order =>
          order.id === orderId ? { ...order, status: 'CANCELLED' } : order
        ));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error(err);
      alert("System error");
    } finally {
      setCancellingId(null);
    }
  };

  const displayOrders = orders.map(order => {
    const validItems = order.items.filter(item => {
      if (item.item_status === 'LOST') return false;
      if (order.status === 'CHECKED_OUT' && item.due_at) {
        const remainingDays = calculateRemainingDays(item.due_at);
        if (remainingDays !== null && remainingDays <= -90) return false;
      }
      return true;
    });
    return { ...order, items: validItems };
  }).filter(order => order.items.length > 0);

  if (loading) return <div className="min-h-screen bg-lumina-surface flex justify-center items-center font-jakarta text-xl font-semibold text-lumina-text-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-lumina-surface pb-16 overflow-x-hidden">
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10">

        <header className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-status-available/15 text-status-available border-4 border-white shadow-lumina-sm flex items-center justify-center mb-4">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h1 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text mb-2">Your Reservations</h1>
          <p className="font-jakarta text-base md:text-lg text-lumina-text-muted max-w-lg">
            Track your rental requests. Payment is made at the store when you pick up your reserved books.
          </p>
        </header>

        <div className="flex items-center justify-between md:justify-start md:gap-8 gap-2 bg-white p-4 md:p-5 rounded-2xl border border-lumina-outline/40 shadow-lumina-sm mb-10 overflow-x-auto">
          {RESERVATION_STEPS.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && <div className="h-0.5 w-6 md:w-10 bg-lumina-outline shrink-0"></div>}
              <div className={`flex items-center gap-2 ${index === 2 ? '' : 'opacity-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-sm font-semibold shrink-0 ${index === 2 ? 'bg-status-available text-white' : 'bg-lumina-surface-alt text-lumina-text-muted border border-lumina-outline/50'}`}>{index + 1}</div>
                <span className={`hidden md:inline font-inter text-sm font-semibold ${index === 2 ? 'text-status-available' : 'text-lumina-text-muted'}`}>{step}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="flex justify-start mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-inter text-sm font-semibold text-lumina-primary hover:bg-lumina-primary-soft py-2 px-4 rounded-full transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>

        {displayOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/40 p-12 md:p-16 text-center">
            <svg className="w-16 h-16 text-lumina-outline mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            <h2 className="font-jakarta text-2xl font-bold text-lumina-text mb-2">No order history yet</h2>
            <p className="font-jakarta text-lumina-text-muted mb-6">(or records have been archived)</p>
            <Link to="/" className="inline-block bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-3 px-8 rounded-full transition-colors duration-200 shadow-lumina-sm">
              Browse Mangas
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {displayOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/40 overflow-hidden">

                <div className="bg-lumina-surface-alt flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-5 md:px-6 py-4 border-b border-lumina-outline/40">
                  <span className="font-inter text-sm font-semibold text-lumina-text">Order #{order.id}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                <div className="p-5 md:p-6 space-y-5">

                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                      <p className="font-inter text-xs uppercase tracking-wider text-lumina-text-muted mb-1">Requested At</p>
                      <p className="font-jakarta font-semibold text-lumina-text">{order.requested_at_formatted || order.requested_at}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-inter text-xs uppercase tracking-wider text-lumina-text-muted mb-1">Total Fee</p>
                      <p className="font-jakarta font-extrabold text-2xl text-lumina-primary leading-none">{order.total_rent_fee} THB</p>
                      <p className="font-inter text-xs text-lumina-text-muted mt-1">Due at pickup</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-lumina-surface-alt border border-lumina-outline/40 rounded-lg p-3.5">
                    <svg className="w-5 h-5 shrink-0 text-lumina-primary mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.8a1 1 0 01.3-.7l6-6A2 2 0 0021 5V3.6a.6.6 0 00-1-.43L14.35 8.8M13.5 21h-3m3 0H3V17a4 4 0 014-4h3.5m0 8v-8m0 0V9a3 3 0 00-3-3H6" />
                    </svg>
                    <p className="font-inter text-xs text-lumina-text-muted leading-relaxed">
                      Visit the store to collect your books. Payment is made at the counter upon pickup.
                    </p>
                  </div>

                  <div>
                    <p className="font-inter text-xs uppercase tracking-wider text-lumina-text-muted mb-3">Manga Items</p>
                    <div className="space-y-3">
                      {order.items.map((item) => {
                        const remainingDays = calculateRemainingDays(item.due_at);

                        let countdownStyle = '';
                        if (remainingDays > 0) countdownStyle = 'bg-status-available/10 text-status-available';
                        else if (remainingDays === 0) countdownStyle = 'bg-status-pending/15 text-status-pending';
                        else if (remainingDays < 0) countdownStyle = 'bg-status-overdue/10 text-status-overdue';

                        return (
                          <div key={item.id} className="border border-lumina-outline/50 rounded-xl overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 px-4 py-3.5">
                              <div className="min-w-0">
                                <h4 className="font-jakarta font-semibold text-base text-lumina-text leading-snug">{item.manga_title}</h4>
                                <span className="inline-flex items-center gap-1.5 mt-1.5 bg-lumina-surface-alt text-lumina-text-muted px-2.5 py-1 rounded-full font-inter text-xs">
                                  Copy ID: {item.serial_no}
                                </span>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                <span className="bg-lumina-primary-soft text-lumina-primary font-inter text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                                  {item.rent_days} days
                                </span>
                                <span className="font-inter text-sm text-lumina-text-muted whitespace-nowrap">
                                  {item.rent_price_per_day} THB/day
                                </span>
                              </div>
                            </div>

                            {order.status === 'CHECKED_OUT' && item.due_at && remainingDays !== null && (
                              <div className={`px-4 py-2.5 font-inter text-sm font-bold border-t border-lumina-outline/40 ${countdownStyle}`}>
                                {remainingDays > 0 && `Days left: ${remainingDays}`}
                                {remainingDays === 0 && `Due today!`}
                                {remainingDays < 0 && `Overdue by ${Math.abs(remainingDays)} day(s)`}
                              </div>
                            )}

                            {item.item_status === 'RETURNED' && (
                              <div className="px-4 py-3 border-t border-lumina-outline/40 bg-lumina-surface-alt flex flex-wrap gap-2 justify-between items-center">
                                <span className="flex items-center gap-1.5 font-inter text-sm font-semibold text-status-available">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  Returned successfully
                                </span>
                                <StarRating
                                  initialRating={item.user_rating}
                                  mangaId={item.manga_id}
                                  onRate={handleRateManga}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {order.status === 'REQUESTED' && (
                    <div className="flex justify-end border-t border-lumina-outline/40 pt-4">
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingId === order.id}
                        className={`font-inter font-semibold text-sm py-2.5 px-6 rounded-full transition-colors duration-200 ${cancellingId === order.id ? 'bg-lumina-surface-alt text-lumina-text-muted cursor-not-allowed' : 'border border-status-overdue/60 text-status-overdue hover:bg-status-overdue/10'}`}
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
