import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';
import StatusBadge from '../components/StatusBadge';

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

const TABS = [
  { key: 'new', label: 'New Requests' },
  { key: 'pickup', label: 'Awaiting Pickup' },
  { key: 'rented', label: 'Currently Rented' },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [returningItems, setReturningItems] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [fineModal, setFineModal] = useState({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' });
  const [fineData, setFineData] = useState({ fine_type: 'LATE', fine_amount: '' });
  const [isSubmittingFine, setIsSubmittingFine] = useState(false);

  const navigate = useNavigate();

  const fetchOrders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    authFetch(`${API_URL}/api/admin/orders/`)
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

    try {
      const response = await authFetch(`${API_URL}/api/admin/orders/${orderId}/${action}/`, {
        method: 'POST',
      });
      if (response.ok) fetchOrders();
      else alert("An error occurred");
    } catch { alert("System error"); }
  };

  const handleCompleteReturn = async (orderId, itemId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/orders/${orderId}/items/${itemId}/return/`, {
        method: 'POST',
      });
      if (response.ok) {
        setReturningItems(returningItems.filter(id => id !== itemId));
        fetchOrders();
      } else {
        alert("An error occurred");
      }
    } catch { alert("System error"); }
  };

  const handleSubmitFine = async (e) => {
    e.preventDefault();

    const amount = parseFloat(fineData.fine_amount);
    if (!fineData.fine_amount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid fine amount (must be greater than 0).");
      return;
    }

    if (isSubmittingFine) return;
    setIsSubmittingFine(true);

    try {
      const response = await authFetch(`${API_URL}/api/admin/orders/${fineModal.orderId}/items/${fineModal.itemId}/fine/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fine_type: fineData.fine_type,
          fine_amount: amount
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
    } catch { alert("System error"); }
    finally {
      setIsSubmittingFine(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading Orders...</div>;

  const requestedOrders = orders.filter(o => o.status?.toUpperCase() === 'REQUESTED');
  const approvedOrders = orders.filter(o => o.status?.toUpperCase() === 'APPROVED');
  const checkedOutOrders = orders.filter(o => o.status?.toUpperCase() === 'CHECKED_OUT');

  const tabCounts = { new: requestedOrders.length, pickup: approvedOrders.length, rented: checkedOutOrders.length };

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
          const isActive = item.path === '/admin/orders';
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

  const emptyState = (message) => (
    <div className="bg-white rounded-2xl border border-dashed border-lumina-outline/60 p-12 text-center">
      <p className="font-jakarta text-lumina-text-muted italic">{message}</p>
    </div>
  );

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
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">Rental Management</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">Manage online reservations and in-store pickups.</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'New Requests', value: requestedOrders.length, accent: 'text-status-requested bg-status-requested/10', tab: 'new' },
            { label: 'Awaiting Pickup', value: approvedOrders.length, accent: 'text-status-pending bg-status-pending/10', tab: 'pickup' },
            { label: 'Active Rentals', value: checkedOutOrders.length, accent: 'text-lumina-primary bg-lumina-primary-soft', tab: 'rented' },
          ].map(card => (
            <button key={card.label} onClick={() => setActiveTab(card.tab)} className={`bg-white rounded-2xl p-5 shadow-lumina-sm border border-lumina-outline/30 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lumina-lg ${activeTab === card.tab ? 'ring-2 ring-lumina-primary' : ''}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.accent}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <h3 className="font-inter text-sm text-lumina-text-muted mb-1">{card.label}</h3>
              <p className="font-jakarta font-extrabold text-3xl text-lumina-text leading-none">{card.value}</p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden mb-6">
          <div className="flex overflow-x-auto border-b border-lumina-outline/40 px-2 pt-2 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 font-inter text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === tab.key ? 'border-lumina-primary text-lumina-primary' : 'border-transparent text-lumina-text-muted hover:text-lumina-text'}`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-lumina-primary text-white' : 'bg-lumina-surface-alt text-lumina-text-muted'}`}>{tabCounts[tab.key]}</span>
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6">

            {activeTab === 'new' && (
              requestedOrders.length === 0 ? (
                emptyState('No new requests')
              ) : (
                <div className="space-y-4">
                  {requestedOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-lumina-outline/40 shadow-lumina-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-jakarta font-semibold text-lumina-text">Customer: {order.customer_name}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="font-inter text-xs text-lumina-text-muted">Order #{order.id} · Requested at: {order.requested_at_formatted}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleAction(order.id, 'approve')} className="bg-lumina-primary hover:bg-lumina-primary-light text-white py-2 px-5 rounded-lg font-inter text-sm font-semibold shadow-lumina-sm transition-colors">
                          Approve
                        </button>
                        <button onClick={() => handleAction(order.id, 'reject')} className="border border-status-overdue/60 text-status-overdue hover:bg-status-overdue/10 py-2 px-5 rounded-lg font-inter text-sm font-semibold transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'pickup' && (
              approvedOrders.length === 0 ? (
                emptyState('No pending pickups')
              ) : (
                <div className="space-y-4">
                  {approvedOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-lumina-outline/40 shadow-lumina-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-jakarta font-semibold uppercase text-lumina-text">Customer: {order.customer_name}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="font-inter text-xs text-lumina-text-muted">Order #{order.id}</p>
                      </div>
                      <button onClick={() => handleAction(order.id, 'checkout')} className="shrink-0 bg-lumina-secondary hover:bg-lumina-secondary-light text-white py-2 px-5 rounded-lg font-inter text-sm font-semibold shadow-lumina-sm transition-colors">
                        Mark as Picked Up
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'rented' && (
              checkedOutOrders.length === 0 ? (
                emptyState('No active rentals')
              ) : (
                <div className="space-y-6">
                  {checkedOutOrders.map(order => (
                    <div key={order.id} className="rounded-2xl border border-lumina-outline/40 shadow-lumina-sm overflow-hidden bg-white">
                      <div className="bg-lumina-surface-alt px-5 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-lumina-outline/40">
                        <p className="font-jakarta font-semibold text-lumina-text">
                          Customer: <span className="text-lumina-primary">{order.customer_name}</span>
                        </p>
                        <span className="font-inter text-xs text-lumina-text-muted">Order #{order.id}</span>
                        <span className="ml-auto"><StatusBadge status={order.status} /></span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[560px]">
                          <thead>
                            <tr className="border-b border-lumina-outline/40">
                              <th className="px-5 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Manga Title</th>
                              <th className="px-5 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Serial No.</th>
                              <th className="px-5 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-right">Status / Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-lumina-outline/30">
                            {order.items.map((item) => (
                              <tr key={item.id} className="hover:bg-lumina-surface-alt/60 transition-colors">
                                <td className="px-5 py-4 font-jakarta text-sm font-medium text-lumina-text">{item.manga_title}</td>
                                <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted">{item.serial_no}</td>
                                <td className="px-5 py-4 text-right">

                                  {item.item_status?.toUpperCase() === 'CHECKED_OUT' ? (
                                    !returningItems.includes(item.id) ? (
                                      <button
                                        onClick={() => setReturningItems([...returningItems, item.id])}
                                        className="border border-lumina-primary/60 text-lumina-primary hover:bg-lumina-primary-soft font-inter font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors"
                                      >
                                        Return Book
                                      </button>
                                    ) : (
                                      <div className="flex justify-end items-center gap-2 animate-fade-in">
                                        <button
                                          onClick={() => handleCompleteReturn(order.id, item.id)}
                                          className="bg-status-available hover:bg-status-available/80 text-white font-inter font-semibold py-1.5 px-3 rounded-lg shadow-lumina-sm text-xs transition-colors"
                                        >
                                          Normal Return
                                        </button>
                                        <button
                                          onClick={() => setFineModal({ isOpen: true, orderId: order.id, itemId: item.id, mangaTitle: item.manga_title })}
                                          className="bg-status-overdue hover:bg-status-overdue/80 text-white font-inter font-semibold py-1.5 px-3 rounded-lg shadow-lumina-sm text-xs transition-colors"
                                        >
                                          With Fine
                                        </button>
                                        <button
                                          onClick={() => setReturningItems(returningItems.filter(id => id !== item.id))}
                                          aria-label="Cancel return"
                                          className="text-lumina-text-muted hover:text-status-overdue px-2"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <StatusBadge status={item.item_status} />
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
              )
            )}

          </div>
        </div>

        <p className="font-inter text-xs text-lumina-text-muted flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Payment is made at the store upon pickup — checkout records the physical handover only.
        </p>
      </main>

      {fineModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lumina-lg p-6 md:p-8 w-full max-w-sm animate-fade-in">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-jakarta font-bold text-2xl text-lumina-text">Record Return</h3>
              <button
                onClick={() => setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' })}
                aria-label="Close modal"
                className="text-lumina-text-muted hover:text-status-overdue transition-colors p-1 -mr-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <p className="font-jakarta text-sm text-lumina-text-muted mb-6">For item: <span className="font-semibold text-lumina-text">{fineModal.mangaTitle}</span></p>

            <form onSubmit={handleSubmitFine} className="space-y-5">
              <div>
                <label htmlFor="fine-reason" className="block font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2">Fine Reason</label>
                <select
                  id="fine-reason"
                  value={fineData.fine_type}
                  onChange={(e) => setFineData({...fineData, fine_type: e.target.value})}
                  className="w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text focus:outline-none focus:ring-1 focus:ring-lumina-primary focus:border-lumina-primary transition-shadow"
                >
                  <option value="LATE">Late Return</option>
                  <option value="DAMAGE">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              <div>
                <label htmlFor="fine-amount" className="block font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2">Amount (THB)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={fineData.fine_amount}
                  onChange={(e) => setFineData({...fineData, fine_amount: e.target.value})}
                  className="w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 focus:outline-none focus:ring-1 focus:ring-lumina-primary focus:border-lumina-primary transition-shadow"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' })}
                  className="flex-1 border border-lumina-outline/60 text-lumina-text font-inter font-semibold py-3 rounded-lg hover:bg-lumina-surface-alt transition-colors"
                  disabled={isSubmittingFine}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFine}
                  className={`flex-1 text-white font-inter font-semibold py-3 rounded-lg transition-colors shadow-lumina-sm ${isSubmittingFine ? 'bg-lumina-primary-light opacity-70 cursor-not-allowed' : 'bg-lumina-primary hover:bg-lumina-primary-light'}`}
                >
                  {isSubmittingFine ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
};

export default AdminOrders;
