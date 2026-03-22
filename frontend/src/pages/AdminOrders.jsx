import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [returningItems, setReturningItems] = useState([]); 
  
  const [fineModal, setFineModal] = useState({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' });
  const [fineData, setFineData] = useState({ fine_type: 'LATE', fine_amount: '' });

  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchOrders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    fetch(`${API_URL}/api/admin/orders/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchOrders(); }, [API_URL]);

  const handleAction = async (orderId, action) => {
    const confirmMsg = action === 'approve' ? "Confirm approval?" : action === 'reject' ? "Confirm rejection?" : "Confirm customer has received the books?";
    if (!window.confirm(confirmMsg)) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/${action}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchOrders();
      else alert("An error occurred");
    } catch (err) { alert("System error"); }
  };

  const handleCompleteReturn = async (orderId, itemId) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/items/${itemId}/return/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setReturningItems(returningItems.filter(id => id !== itemId));
        fetchOrders();
      } else {
        alert("An error occurred");
      }
    } catch (err) { alert("System error"); }
  };

  const handleSubmitFine = async (e) => {
    e.preventDefault();
    if (!fineData.fine_amount || fineData.fine_amount <= 0) {
      alert("Please enter a valid fine amount"); return;
    }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${fineModal.orderId}/items/${fineModal.itemId}/fine/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fine_type: fineData.fine_type,
          fine_amount: fineData.fine_amount
        })
      });

      if (response.ok) {
        alert("Fine saved and return completed!");
        setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' });
        setFineData({ fine_type: 'LATE', fine_amount: '' });
        setReturningItems(returningItems.filter(id => id !== fineModal.itemId));
        fetchOrders();
      } else {
        alert("Failed to save fine");
      }
    } catch (err) { alert("System error"); }
  };

  if (loading) return <div className="min-h-screen bg-brand-light flex items-center justify-center font-bold text-brand-primary">Loading Orders...</div>;

  const requestedOrders = orders.filter(o => o.status?.toUpperCase() === 'REQUESTED');
  const approvedOrders = orders.filter(o => o.status?.toUpperCase() === 'APPROVED');
  const checkedOutOrders = orders.filter(o => o.status?.toUpperCase() === 'CHECKED_OUT');

  return (
    <div className="min-h-screen bg-brand-light p-4 md:p-10 relative">
      <div className="max-w-5xl mx-auto bg-brand-light rounded-3xl shadow-xl p-8 relative">
        
        <button onClick={() => navigate('/admin/dashboard')} className="absolute top-8 left-8 text-brand-primary hover:text-brand-primary transition">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-3xl font-black text-center text-brand-primary mb-10 uppercase tracking-tighter">Rental Management</h1>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-brand-primary mb-4 border-b pb-2 flex justify-between items-center">
            New Rental Requests
            {requestedOrders.length > 0 && <span className="bg-brand-accent text-brand-light text-xs px-2 py-1 rounded-full animate-pulse">{requestedOrders.length}</span>}
          </h2>
          {requestedOrders.length === 0 ? <p className="text-brand-primary italic">No new requests</p> : (
            <div className="space-y-4">
              {requestedOrders.map(order => (
                <div key={order.id} className="bg-brand-light border border-brand-secondary rounded-xl p-5 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-brand-primary">Customer: {order.customer_name}</p>
                    <p className="text-xs text-brand-primary">Requested at: {order.requested_at_formatted}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(order.id, 'approve')} className="bg-brand-accent hover:bg-brand-primary text-brand-light py-2 px-6 rounded-lg text-sm font-bold shadow-md transition">Approve</button>
                    <button onClick={() => handleAction(order.id, 'reject')} className="bg-brand-accent hover:bg-brand-primary text-brand-light py-2 px-6 rounded-lg text-sm font-bold shadow-md transition">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-brand-primary mb-4 border-b pb-2">Awaiting Pickup</h2>
          {approvedOrders.length === 0 ? <p className="text-brand-primary italic">No pending pickups</p> : (
            <div className="space-y-4">
              {approvedOrders.map(order => (
                <div key={order.id} className="bg-brand-light border border-brand-light rounded-xl p-5 flex justify-between items-center shadow-sm">
                  <p className="text-sm font-bold text-brand-primary uppercase">Customer: {order.customer_name}</p>
                  <button onClick={() => handleAction(order.id, 'checkout')} className="bg-brand-secondary hover:bg-brand-primary text-brand-light py-2 px-6 rounded-lg text-sm font-bold shadow-md transition">Mark as Picked Up</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-brand-primary mb-4 border-b pb-2">Currently Rented</h2>
          {checkedOutOrders.length === 0 ? <p className="text-brand-primary italic">No active rentals</p> : (
            <div className="space-y-6">
              {checkedOutOrders.map(order => (
                <div key={order.id} className="border-2 border-brand-light rounded-2xl p-6 hover:border-brand-secondary transition">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold text-brand-primary">
                      Customer: <span className="text-brand-secondary underline decoration-brand-light">{order.customer_name}</span> 
                      <span className="text-xs text-brand-primary ml-3">ID: #{order.id}</span>
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-brand-light text-brand-primary font-bold uppercase text-[10px] tracking-widest border-b">
                        <tr>
                          <th className="px-4 py-3">Manga Title</th>
                          <th className="px-4 py-3">Serial No.</th>
                          <th className="px-4 py-3 text-right">Status/Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-brand-light transition">
                            <td className="px-4 py-4 font-bold text-brand-primary">{item.manga_title}</td>
                            <td className="px-4 py-4 text-brand-primary">{item.serial_no}</td>
                            <td className="px-4 py-4 text-right">
                              
                              {item.item_status?.toUpperCase() === 'CHECKED_OUT' ? (
                                !returningItems.includes(item.id) ? (
                                  <button 
                                    onClick={() => setReturningItems([...returningItems, item.id])}
                                    className="bg-brand-light border-2 border-brand-accent text-brand-secondary hover:bg-brand-light font-bold py-1.5 px-4 rounded-lg text-xs transition shadow-sm"
                                  >
                                    Return Book
                                  </button>
                                ) : (
                                  <div className="flex justify-end items-center gap-2 animate-fade-in">
                                    <button 
                                      onClick={() => handleCompleteReturn(order.id, item.id)}
                                      className="bg-brand-accent hover:bg-brand-primary text-brand-light font-bold py-1.5 px-3 rounded-lg shadow-md text-xs transition"
                                    >
                                      Normal Return
                                    </button>
                                    <button 
                                      onClick={() => setFineModal({ isOpen: true, orderId: order.id, itemId: item.id, mangaTitle: item.manga_title })}
                                      className="bg-brand-accent hover:bg-brand-primary text-brand-light font-bold py-1.5 px-3 rounded-lg shadow-md text-xs transition"
                                    >
                                      With Fine
                                    </button>
                                    <button 
                                      onClick={() => setReturningItems(returningItems.filter(id => id !== item.id))}
                                      className="text-brand-light hover:text-brand-primary px-2 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className={`font-bold text-[10px] uppercase px-3 py-1 rounded-full ${item.item_status?.toUpperCase() === 'RETURNED' ? 'bg-brand-light text-brand-secondary' : 'bg-brand-light text-brand-secondary'}`}>
                                  {item.item_status === 'RETURNED' ? 'Returned' : item.item_status}
                                </span>
                              )}

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fineModal.isOpen && (
        <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-brand-light rounded-3xl shadow-2xl p-8 w-full max-w-sm animate-fade-in border-t-8 border-brand-secondary">
            <h3 className="text-2xl font-black text-brand-primary mb-2">Fine Payment</h3>
            <p className="text-sm text-brand-primary mb-6 italic">For item: {fineModal.mangaTitle}</p>
            
            <form onSubmit={handleSubmitFine} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-brand-primary uppercase mb-2">Fine Reason</label>
                <select 
                  value={fineData.fine_type} 
                  onChange={(e) => setFineData({...fineData, fine_type: e.target.value})}
                  className="w-full border-2 border-brand-light rounded-xl px-4 py-3 text-brand-primary focus:outline-none focus:border-brand-accent bg-brand-light"
                >
                  <option value="LATE">Late Return</option>
                  <option value="DAMAGE">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-black text-brand-primary uppercase mb-2">Amount (THB)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={fineData.fine_amount}
                  onChange={(e) => setFineData({...fineData, fine_amount: e.target.value})}
                  className="w-full border-2 border-brand-light rounded-xl px-4 py-3 text-brand-primary focus:outline-none focus:border-brand-accent bg-brand-light"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' })}
                  className="flex-1 text-brand-primary font-bold hover:text-brand-primary transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-brand-primary hover:bg-brand-primary text-brand-light font-bold py-3 rounded-xl transition shadow-lg"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />
    </div>
  );
};

export default AdminOrders;