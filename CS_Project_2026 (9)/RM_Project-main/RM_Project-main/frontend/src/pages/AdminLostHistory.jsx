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

const AdminHistory = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    authFetch(`${API_URL}/api/admin/history/`)
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/signin';
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setHistoryItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching history:", err);
        setLoading(false);
      });
  }, [navigate, API_URL]);

  const displayedItems = historyItems.filter(item => {
    const matchTab = activeTab === 'ALL' || item.item_status === 'LOST';
    if (!matchTab) return false;

    if (!searchQuery) return true;

    const lowerQuery = searchQuery.toLowerCase();

    const matchName = item.customer_name?.toLowerCase().includes(lowerQuery);
    const matchTitle = item.manga_title?.toLowerCase().includes(lowerQuery);
    const matchSerial = item.serial_no?.toLowerCase().includes(lowerQuery);
    const matchOrderId = item.order_id?.toString().includes(lowerQuery);

    return matchName || matchTitle || matchSerial || matchOrderId;
  });

  if (loading) return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading history...</div>;

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
          const isActive = item.path === '/admin/history';
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
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">Rental History</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">Complete record of all rentals and returns.</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="inline-flex w-fit rounded-full border border-lumina-outline/50 bg-white p-1 shadow-lumina-sm">
            {[
              { key: 'ALL', label: 'All Records' },
              { key: 'LOST', label: 'Lost Records' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-full font-inter text-sm font-semibold transition-colors duration-200 ${activeTab === tab.key ? 'bg-lumina-primary text-white shadow-lumina-sm' : 'text-lumina-text-muted hover:text-lumina-text'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-lumina-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Search by customer, manga title, serial, or order ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-lumina-outline/60 rounded-full pl-11 pr-10 py-2.5 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-lumina-text-muted hover:text-status-overdue transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-lumina-outline/40 bg-lumina-surface-alt/60">
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">ID</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Customer</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Manga (Serial No)</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Rented At</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Due Date</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Returned At</th>
                  <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Return Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lumina-outline/30">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 font-jakarta text-lumina-text-muted italic text-center">No records in this category</td>
                  </tr>
                ) : (
                  displayedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-lumina-surface-alt/60 transition-colors">
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted">#{item.order_id}</td>
                      <td className="px-5 py-4 font-jakarta text-sm font-semibold text-lumina-text whitespace-nowrap">{item.customer_name}</td>
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text">{item.manga_title} <span className="text-lumina-text-muted">({item.serial_no})</span></td>
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted whitespace-nowrap">{item.rental_date_formatted}</td>
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted whitespace-nowrap">{item.due_at_formatted}</td>
                      <td className="px-5 py-4 font-inter text-sm font-semibold text-lumina-text whitespace-nowrap">{item.returned_at_formatted}</td>
                      <td className="px-5 py-4">

                        {item.display_status === 'ON_TIME' && <span className="badge-success">On Time</span>}
                        {item.display_status === 'LATE' && <span className="badge-danger">Late</span>}
                        {item.item_status === 'LOST' && <StatusBadge status="LOST" />}
                        {item.item_status === 'CHECKED_OUT' && <StatusBadge status="CHECKED_OUT" />}

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

    </div>
  );
};

export default AdminHistory;
