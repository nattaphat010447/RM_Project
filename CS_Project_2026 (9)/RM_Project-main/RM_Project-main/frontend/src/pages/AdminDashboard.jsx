import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';
import StatusBadge from '../components/StatusBadge';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    path: '/admin/dashboard',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h5v6H4V5zm10 0a1 1 0 011-1h5v6h-6V4zM4 14a1 1 0 011-1h5v6H5a1 1 0 01-1-1v-5zm10-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5v-6z" />,
  },
  {
    title: 'Rentals',
    path: '/admin/orders',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />,
  },
  {
    title: 'Members',
    path: '/admin/members',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    title: 'Books',
    path: '/admin/mangas',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" />,
  },
  {
    title: 'History',
    path: '/admin/history',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    title: 'A/B Testing',
    path: '/admin/ab-testing',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
  },
  {
    title: 'ML Training',
    path: '/admin/ml-training',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
];

const STATUS_BAR_COLORS = {
  REQUESTED: 'bg-status-requested',
  APPROVED: 'bg-status-pending',
  CHECKED_OUT: 'bg-lumina-primary',
  RETURNED: 'bg-status-available',
  CANCELLED: 'bg-lumina-outline',
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mangas, setMangas] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    let isMounted = true;

    Promise.all([
      fetch(`${API_URL}/api/mangas/`)
        .then(res => res.json())
        .catch(() => []),
      authFetch(`${API_URL}/api/admin/orders/`)
        .then(res => (res.ok ? res.json() : []))
        .catch(() => []),
    ]).then(([mangaData, orderData]) => {
      if (!isMounted) return;
      setMangas(Array.isArray(mangaData) ? mangaData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [navigate]);

  const totalTitles = mangas.length;
  const totalCopiesAvailable = mangas.reduce(
    (sum, m) => sum + ((Array.isArray(m.copies) ? m.copies : []).filter(c => c.status === 'AVAILABLE').length),
    0
  );
  const pendingRequests = orders.filter(o => o.status?.toUpperCase() === 'REQUESTED').length;
  const activeRentals = orders.filter(o => o.status?.toUpperCase() === 'CHECKED_OUT').length;

  const statusCounts = orders.reduce((acc, order) => {
    const key = order.status?.toUpperCase() || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const statCards = [
    { label: 'Total Manga Titles', value: totalTitles, icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247', accent: 'text-lumina-primary bg-lumina-primary-soft' },
    { label: 'Copies Available', value: totalCopiesAvailable, icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', accent: 'text-status-available bg-status-available/10' },
    { label: 'Pending Requests', value: pendingRequests, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-status-requested bg-status-requested/10' },
    { label: 'Active Rentals', value: activeRentals, icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4', accent: 'text-lumina-secondary bg-lumina-secondary/10' },
  ];

  const recentOrders = orders.slice(0, 5);

  const sidebar = (
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
          const isActive = item.path === '/admin/dashboard';
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
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative w-64 max-w-[80vw] h-full shadow-lumina-lg">{sidebar}</div>
        </div>
      )}

      <main className="md:ml-64 min-h-screen p-4 md:p-8 lg:p-10">

        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">Dashboard</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">Overview of store activity and rentals.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </header>

        <div className="hidden sm:flex gap-3 mb-8">
          <button onClick={() => navigate('/admin/mangas/new')} className="inline-flex items-center gap-2 bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter text-sm font-semibold px-5 py-2.5 rounded-full shadow-lumina-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
            Add Book
          </button>
          <button onClick={() => navigate('/admin/members/new')} className="inline-flex items-center gap-2 bg-white border border-lumina-outline/60 hover:bg-lumina-surface-alt text-lumina-text font-inter text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 1112 0" /></svg>
            New Member
          </button>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 ${loading ? 'opacity-60' : ''}`}>
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-lumina-sm border border-lumina-outline/30 transition-transform hover:-translate-y-0.5 hover:shadow-lumina-lg duration-300">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${card.accent}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={card.icon} /></svg>
              </div>
              <h3 className="font-inter text-sm text-lumina-text-muted mb-1">{card.label}</h3>
              <p className="font-jakarta font-extrabold text-3xl text-lumina-text leading-none">{loading ? '—' : card.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {!loading && statusTotal > 0 && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-lumina-sm border border-lumina-outline/30 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-jakarta font-semibold text-lg text-lumina-text">Order Status Distribution</h3>
              <span className="font-inter text-xs text-lumina-text-muted">{statusTotal} total</span>
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-lumina-surface-alt">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className={`${STATUS_BAR_COLORS[status] || 'bg-lumina-text-muted'} h-full`} style={{ width: `${(count / statusTotal) * 100}%` }} title={`${status}: ${count}`}></div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 font-inter text-xs text-lumina-text-muted">
                  <span className={`w-3 h-3 rounded-full block shrink-0 ${STATUS_BAR_COLORS[status] || 'bg-lumina-text-muted'}`}></span>
                  <StatusBadge status={status} />
                  <span className="ml-auto font-semibold text-lumina-text">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-lumina-outline/40 flex justify-between items-center bg-lumina-surface-alt">
            <h3 className="font-jakarta font-semibold text-lg text-lumina-text">Recent Reservations</h3>
            <button onClick={() => navigate('/admin/orders')} className="font-inter text-sm font-semibold text-lumina-primary hover:underline">
              View All
            </button>
          </div>

          {loading ? (
            <p className="p-8 text-center font-jakarta text-lumina-text-muted">Loading dashboard data...</p>
          ) : recentOrders.length === 0 ? (
            <p className="p-8 text-center font-jakarta text-lumina-text-muted">No rental orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-lumina-outline/40">
                    <th className="px-5 md:px-6 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">ID</th>
                    <th className="px-5 md:px-6 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Customer</th>
                    <th className="px-5 md:px-6 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Items</th>
                    <th className="px-5 md:px-6 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Date Requested</th>
                    <th className="px-5 md:px-6 py-3 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lumina-outline/30">
                  {recentOrders.map(order => {
                    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                    return (
                      <tr key={order.id} className="hover:bg-lumina-surface-alt/60 transition-colors cursor-pointer" onClick={() => navigate('/admin/orders')}>
                        <td className="px-5 md:px-6 py-4 font-inter text-sm text-lumina-text-muted whitespace-nowrap">#{order.id}</td>
                        <td className="px-5 md:px-6 py-4 font-jakarta text-sm font-medium text-lumina-text truncate max-w-[160px]">{order.customer_name}</td>
                        <td className="px-5 md:px-6 py-4 font-jakarta text-sm text-lumina-text truncate max-w-[220px]">
                          {itemCount > 0 ? order.items[0].manga_title : '—'}
                          {itemCount > 1 && <span className="text-lumina-text-muted"> +{itemCount - 1} more</span>}
                        </td>
                        <td className="px-5 md:px-6 py-4 font-inter text-sm text-lumina-text-muted whitespace-nowrap">{order.requested_at_formatted || order.requested_at}</td>
                        <td className="px-5 md:px-6 py-4"><StatusBadge status={order.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
