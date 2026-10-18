import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../api';

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

const getInitials = (name) =>
  name?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const fetchMembers = () => {
    authFetch(`${API_URL}/api/admin/users/`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load members');
        return res.json();
      })
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove member "${name}"? (data will be hidden from the system)`)) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/users/${id}/`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert("Member removed successfully");
        setMembers(members.filter(m => m.id !== id));
      } else {
        alert("Failed to remove member");
      }
    } catch { alert("System error"); }
  };

  if (loading) return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading Members...</div>;

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
          const isActive = item.path === '/admin/members';
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
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">Member Management</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">View, add, or remove library member accounts.</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <div className="flex items-center justify-between mb-4">
          <p className="font-inter text-sm text-lumina-text-muted"><span className="font-semibold text-lumina-text">{members.length}</span> members registered</p>
          <Link to="/admin/members/new" className="inline-flex items-center gap-2 bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter text-sm font-semibold px-5 py-2.5 rounded-full shadow-lumina-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add New Member
          </Link>
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-lumina-outline/60 p-12 text-center">
            <p className="font-jakarta text-lumina-text-muted italic">No members found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-lumina-outline/40 bg-lumina-surface-alt/60">
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">ID</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Member</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Email</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Phone</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lumina-outline/30">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-lumina-surface-alt/60 transition-colors">
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted">#{member.id}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-lumina-primary-soft text-lumina-primary flex items-center justify-center font-inter text-xs font-bold shrink-0">
                            {getInitials(member.full_name)}
                          </div>
                          <span className="font-jakarta text-sm font-semibold text-lumina-text">{member.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted">{member.email}</td>
                      <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted whitespace-nowrap">{member.phone}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/members/edit/${member.id}`} className="border border-lumina-primary/60 text-lumina-primary hover:bg-lumina-primary-soft font-inter font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors">
                            Edit
                          </Link>
                          <button onClick={() => handleDelete(member.id, member.full_name)} className="border border-status-overdue/60 text-status-overdue hover:bg-status-overdue/10 font-inter font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default AdminMembers;
