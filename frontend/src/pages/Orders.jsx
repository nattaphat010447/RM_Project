import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StarRating = ({ initialRating, mangaId, onRate }) => {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(initialRating || 0);

  const handleRating = async (rateValue) => {
    setRating(rateValue);
    await onRate(mangaId, rateValue);
  };

  return (
    <div className="flex items-center space-x-1 bg-brand-light px-3 py-1.5 rounded-lg border border-brand-secondary">
      <span className="text-sm font-semibold text-brand-primary mr-2">Rate:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-125"
        >
          <span className={`text-2xl ${star <= (hover || rating) ? 'text-brand-accent' : 'text-brand-light'}`}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const calculateRemainingDays = (dueDateStr) => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleRateManga = async (mangaId, rating) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/mangas/${mangaId}/review/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
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

    fetch(`${API_URL}/api/orders/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
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
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
    }
  };

  const displayOrders = orders.map(order => {
    const validItems = order.items.filter(item => {
      if (item.item_status === 'LOST') return false;

      if (order.status === 'CHECKED_OUT' && item.due_at) {
        const remainingDays = calculateRemainingDays(item.due_at);
        if (remainingDays <= -90) {
          return false; 
        }
      }
      return true;
    });
    
    return { ...order, items: validItems };
  }).filter(order => order.items.length > 0);

  if (loading) return <div className="min-h-screen bg-brand-light flex justify-center items-center text-brand-primary text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-brand-light pt-16 px-4 pb-12">
      <div className="max-w-4xl mx-auto bg-brand-light rounded-xl shadow-sm border border-brand-secondary p-8 md:p-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-brand-primary mb-10">Rental Requests</h2>
        
        <div className="mb-6">
          <Link to="/" className="inline-block bg-brand-secondary hover:bg-brand-primary text-brand-light font-semibold py-2.5 px-6 rounded-lg shadow-sm transition duration-200">
            Back to Home
          </Link>
        </div>

        {displayOrders.length === 0 ? (
            <div className="text-center text-brand-primary font-semibold text-xl py-10">No order history yet (or records have been archived)</div>
        ) : (
          <div className="space-y-8">
            {displayOrders.map((order) => (
              <div key={order.id} className="flex flex-col shadow-sm">
                
                <div className="bg-brand-primary text-brand-light flex justify-between items-center px-4 py-3 rounded-t-lg">
                  <span className="font-medium tracking-wide">Order ID: {order.id}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">Status:</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs tracking-wider ${
                      order.status === 'REQUESTED' ? 'bg-brand-accent text-brand-primary' : 
                      order.status === 'CANCELLED' ? 'bg-brand-accent text-brand-light' : 
                      order.status === 'REJECTED' ? 'bg-brand-secondary text-brand-light' : 
                      order.status === 'CHECKED_OUT' ? 'bg-brand-accent text-brand-light' :
                      'bg-brand-accent text-brand-primary'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-x border-b border-brand-secondary p-6 rounded-b-lg space-y-4">
                  <div className="space-y-2 text-brand-primary">
                    <p><span className="font-semibold mr-2">Requested At:</span> {order.requested_at_formatted || order.requested_at}</p>
                    <p><span className="font-semibold mr-2">Total Price:</span> {order.total_rent_fee} THB</p>
                  </div>

                  <div className="pt-2">
                    <p className="font-semibold text-brand-primary mb-2">Manga Items:</p>
                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const remainingDays = calculateRemainingDays(item.due_at);

                        return (
                          <div key={item.id} className="flex flex-col border border-brand-secondary rounded-lg overflow-hidden">
                            <div className="bg-brand-light text-brand-primary font-semibold px-4 py-3">
                              {item.manga_title}
                            </div>
                            <div className="flex justify-between items-center px-4 py-4 bg-brand-light border-t border-brand-secondary">
                              <span className="font-medium text-brand-primary">Copy: {item.serial_no}</span>
                              <div className="flex flex-col items-end space-y-1">
                                <span className="bg-brand-secondary text-brand-light text-xs font-semibold px-3 py-1 rounded-full">
                                  {item.rent_days} days
                                </span>
                                <span className="text-brand-primary text-sm">
                                  {item.rent_price_per_day} THB/day
                                </span>
                              </div>
                            </div>
                            
                            {order.status === 'CHECKED_OUT' && item.due_at && remainingDays !== null && (
                              <div className={`px-4 py-2 text-sm font-bold border-t ${
                                remainingDays < 0 ? 'bg-brand-light text-brand-secondary' : 
                                remainingDays === 0 ? 'bg-brand-light text-brand-secondary' : 'bg-brand-light text-brand-secondary'
                              }`}>
                                {remainingDays > 0 && `Days left: ${remainingDays}`}
                                {remainingDays === 0 && `Due today!`}
                                {remainingDays < 0 && `Overdue by ${Math.abs(remainingDays)} day(s)`}
                              </div>
                            )}
                            
                            {item.item_status === 'RETURNED' && (
                              <div className="px-4 py-3 bg-brand-light border-t border-brand-secondary flex justify-between items-center">
                                <span className="text-sm font-semibold text-brand-secondary flex items-center gap-1">
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
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => handleCancel(order.id)}
                        className="bg-brand-primary hover:bg-brand-primary text-brand-light font-semibold py-2 px-6 rounded-lg shadow-sm transition duration-200"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;