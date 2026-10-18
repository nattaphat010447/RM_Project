import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const AdminMemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    password: ''
  });

  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      authFetch(`${API_URL}/api/admin/users/${id}/`)
        .then(res => {
          if (!res.ok) throw new Error(res.status === 404 ? 'Member not found.' : 'Failed to load member.');
          return res.json();
        })
        .then(data => {
          setFormData({
            username: data.username || '',
            fullName: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            dob: data.dob || '',
            password: ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoadError(err.message);
          setLoading(false);
        });
    }
  }, [id, API_URL, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      username: formData.username,
      first_name: firstName,
      last_name: lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      dob: formData.dob
    };

    if (!isEditMode || (isEditMode && formData.password)) {
      payload.password = formData.password;
    }

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${API_URL}/api/admin/users/${id}/` : `${API_URL}/api/admin/users/`;

      const response = await authFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(isEditMode ? "Changes saved successfully" : "Member added successfully");
        navigate('/admin/members');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || Object.values(errorData).flat().join('\n') || "An error occurred. Please verify the input.";
        alert(`Error:\n${errorMessage}`);
      }
    } catch (err) {
        alert("System error: " + err.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading Member...</div>;

  if (loadError) {
    return (
      <div className="min-h-screen bg-lumina-surface flex flex-col items-center justify-center gap-5 px-4">
        <p className="font-jakarta font-semibold text-status-overdue">{loadError}</p>
        <button onClick={() => navigate('/admin/members')} className="border border-lumina-outline/60 hover:bg-white text-lumina-text font-inter font-semibold py-2.5 px-6 rounded-lg transition-colors">
          Back to Members
        </button>
      </div>
    );
  }

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

  const inputClass = "w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow";
  const labelClass = "block font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2";

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
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">{isEditMode ? 'Edit Member' : 'Add New Member'}</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">{isEditMode ? 'Update the member account details below.' : 'Fill in the details to register a new member.'}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8 mb-6">
            <h3 className="font-jakarta font-bold text-lg text-lumina-text mb-6 pb-4 border-b border-lumina-outline/40">Account Details</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="member-username" className={labelClass}>Username *</label>
                <input
                  id="member-username"
                  type="text" required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={inputClass}
                  placeholder="Enter a unique username"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="member-fullname" className={labelClass}>Full Name *</label>
                  <input
                    id="member-fullname"
                    type="text" required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className={inputClass}
                    placeholder="Enter first and last name"
                  />
                </div>

                <div>
                  <label htmlFor="member-dob" className={labelClass}>Date of Birth *</label>
                  <input
                    id="member-dob"
                    type="date" required
                    value={formData.dob}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="member-email" className={labelClass}>Email *</label>
                  <input
                    id="member-email"
                    type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={inputClass}
                    placeholder="Enter member email"
                  />
                </div>

                <div>
                  <label htmlFor="member-phone" className={labelClass}>Phone *</label>
                  <input
                    id="member-phone"
                    type="text" required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={inputClass}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="member-address" className={labelClass}>Address *</label>
                <textarea
                  id="member-address"
                  required
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className={`${inputClass} resize-none`}
                  placeholder="Enter member address"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8 mb-8">
            <h3 className="font-jakarta font-bold text-lg text-lumina-text mb-6 pb-4 border-b border-lumina-outline/40">Security</h3>
            <label htmlFor="member-password" className={labelClass}>
              Password {isEditMode ? '(enter only if you want to change it)' : '*'}
            </label>
            <input
              id="member-password"
              type="password"
              required={!isEditMode}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={isEditMode ? "Leave empty to keep current password" : "Set a password..."}
              className={inputClass}
            />
          </div>

          <div className="flex justify-between items-center gap-4">
            <button type="button" onClick={() => navigate('/admin/members')} className="border border-lumina-outline/60 hover:bg-white text-lumina-text font-inter font-semibold py-2.5 px-6 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-lumina-sm">
              {isEditMode ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>

      </main>

    </div>
  );
};

export default AdminMemberForm;
