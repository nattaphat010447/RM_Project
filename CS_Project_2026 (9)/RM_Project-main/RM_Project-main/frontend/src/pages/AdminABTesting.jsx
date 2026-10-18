import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const AdminABTesting = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [variants, setVariants] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    algorithm: 'MBCGCN',
    traffic_percentage: 0,
    description: '',
    is_active: true
  });

  const algorithmChoices = [
    { value: 'MBCGCN', label: 'MB-CGCN (Two Behaviors)' },
    { value: 'LIGHTGCN', label: 'LightGCN' },
    { value: 'MF', label: 'Matrix Factorization' },
    { value: 'POPULAR', label: 'Popular Items' }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [variantsRes, metricsRes] = await Promise.all([
        authFetch(`${API_URL}/api/admin/ab-test/variants/`),
        authFetch(`${API_URL}/api/admin/ab-test/metrics/`)
      ]);

      const variantsData = await variantsRes.json();
      const metricsData = await metricsRes.json();

      setVariants(variantsData.variants || []);
      setMetrics(metricsData.metrics || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingVariant(null);
    setFormData({
      name: '',
      algorithm: 'MBCGCN',
      traffic_percentage: 0,
      description: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (variant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      algorithm: variant.algorithm,
      traffic_percentage: variant.traffic_percentage,
      description: variant.description || '',
      is_active: variant.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const method = editingVariant ? 'PUT' : 'POST';
    const payload = editingVariant
      ? { ...formData, id: editingVariant.id }
      : formData;

    try {
      const response = await authFetch(`${API_URL}/api/admin/ab-test/variants/`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Saved successfully.');
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error || 'An error occurred.');
      }
    } catch (err) {
      console.error(err);
      alert('System error. Please try again.');
    }
  };

  const handleDelete = async (variantId) => {
    if (!confirm('Confirm delete this variant?')) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/ab-test/variants/?id=${variantId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Deleted successfully.');
        fetchData();
      } else {
        alert(data.error || 'An error occurred.');
      }
    } catch (err) {
      console.error(err);
      alert('System error. Please try again.');
    }
  };

  const getMetricsForVariant = (variantId) => {
    return metrics.find(m => m.id === variantId) || {
      impressions: 0,
      clicks: 0,
      add_to_cart: 0,
      rentals: 0,
      ctr: 0,
      conversion_rate: 0,
      unique_users: 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">Loading experiments...</div>
    );
  }

  const totalTraffic = variants.reduce((sum, v) => sum + parseFloat(v.traffic_percentage || 0), 0);

  const NAV_ITEMS = [
    { title: 'Dashboard', path: '/admin/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h5v6H4V5zm10 0a1 1 0 011-1h5v6h-6V4zM4 14a1 1 0 011-1h5v6H5a1 1 0 01-1-1v-5zm10-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5v-6z" /> },
    { title: 'Rentals', path: '/admin/orders', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" /> },
    { title: 'Members', path: '/admin/members', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { title: 'Books', path: '/admin/mangas', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" /> },
    { title: 'History', path: '/admin/history', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { title: 'A/B Testing', path: '/admin/ab-testing', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
    { title: 'ML Training', path: '/admin/ml-training', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
  ];

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
          const isActive = item.path === '/admin/ab-testing';
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
            <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">A/B Testing Dashboard</h2>
            <p className="font-jakarta text-base text-lumina-text-muted mt-1">Manage recommendation algorithm experiments.</p>
          </div>
          <div className="flex items-start gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={openCreateModal} className="hidden sm:inline-flex items-center gap-2 bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter text-sm font-semibold px-5 py-2.5 rounded-full shadow-lumina-sm transition-colors whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Create Variant
            </button>
          </div>
        </header>

        {totalTraffic !== 100 && variants.filter(v => v.is_active).length > 0 && (
          <div className="bg-status-pending/10 border border-status-pending/40 rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-status-pending shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-status-pending font-inter text-sm font-semibold">
              Traffic allocation: {totalTraffic.toFixed(1)}% (should be 100%)
            </p>
          </div>
        )}

        {variants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-lumina-outline/60 p-12 text-center mb-8">
            <p className="font-jakarta text-lumina-text-muted italic">No experiment variants yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-lumina-outline/40 bg-lumina-surface-alt/60">
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Variant</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted">Algorithm</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-center">Traffic %</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-center">Status</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-center">Users</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-center">CTR</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-center">Conversion</th>
                    <th className="px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lumina-outline/30">
                  {variants.map(variant => {
                    const m = getMetricsForVariant(variant.id);
                    return (
                      <tr key={variant.id} className="hover:bg-lumina-surface-alt/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-jakarta font-semibold text-sm text-lumina-text">{variant.name}</div>
                          {variant.description && (
                            <div className="font-inter text-xs text-lumina-text-muted mt-1">{variant.description}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-inter text-sm font-medium text-lumina-primary">{variant.algorithm}</span>
                        </td>
                        <td className="px-5 py-4 text-center font-jakarta font-bold text-lumina-text">{variant.traffic_percentage}%</td>
                        <td className="px-5 py-4 text-center">
                          {variant.is_active ? (
                            <span className="badge-success">Active</span>
                          ) : (
                            <span className="badge-neutral">Inactive</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center font-inter text-sm font-semibold text-lumina-text">{m.unique_users}</td>
                        <td className="px-5 py-4 text-center font-inter text-sm font-semibold text-lumina-text">{m.ctr}%</td>
                        <td className="px-5 py-4 text-center font-inter text-sm font-semibold text-lumina-text">{m.conversion_rate}%</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(variant)}
                              className="border border-lumina-primary/60 text-lumina-primary hover:bg-lumina-primary-soft font-inter font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(variant.id)}
                              className="border border-status-overdue/60 text-status-overdue hover:bg-status-overdue/10 font-inter font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <h3 className="font-jakarta font-extrabold text-2xl text-lumina-text mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 pb-4">
          {variants.map(variant => {
            const m = getMetricsForVariant(variant.id);
            return (
              <div key={variant.id} className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6">
                <h4 className="font-jakarta font-bold text-lg text-lumina-primary mb-4">{variant.name}</h4>
                <dl className="space-y-2.5 font-inter text-sm">
                  <div className="flex justify-between">
                    <dt className="text-lumina-text-muted">Impressions</dt>
                    <dd className="font-semibold text-lumina-text">{m.impressions}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-lumina-text-muted">Clicks</dt>
                    <dd className="font-semibold text-lumina-text">{m.clicks}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-lumina-text-muted">Add to Cart</dt>
                    <dd className="font-semibold text-lumina-text">{m.add_to_cart}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-lumina-text-muted">Rentals</dt>
                    <dd className="font-semibold text-lumina-text">{m.rentals}</dd>
                  </div>
                  <div className="flex justify-between border-t border-lumina-outline/40 pt-3">
                    <dt className="text-lumina-text-muted">CTR</dt>
                    <dd className="font-bold text-lumina-primary">{m.ctr}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-lumina-text-muted">Conversion</dt>
                    <dd className="font-bold text-status-available">{m.conversion_rate}%</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>

      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lumina-lg w-full max-w-md p-6 md:p-8 animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <h3 className="font-jakarta font-bold text-2xl text-lumina-text">
                {editingVariant ? 'Edit Variant' : 'Create Variant'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="text-lumina-text-muted hover:text-status-overdue transition-colors p-1 -mr-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="variant-name" className={labelClass}>Name</label>
                <input
                  id="variant-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="variant-algorithm" className={labelClass}>Algorithm</label>
                <select
                  id="variant-algorithm"
                  value={formData.algorithm}
                  onChange={(e) => setFormData({...formData, algorithm: e.target.value})}
                  className={inputClass}
                >
                  {algorithmChoices.map(choice => (
                    <option key={choice.value} value={choice.value}>{choice.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="variant-traffic" className={labelClass}>Traffic % (0-100)</label>
                <input
                  id="variant-traffic"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={formData.traffic_percentage}
                  onChange={(e) => setFormData({...formData, traffic_percentage: parseFloat(e.target.value)})}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="variant-description" className={labelClass}>Description</label>
                <textarea
                  id="variant-description"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={`${inputClass} resize-none`}
                ></textarea>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  id="variant-active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded accent-lumina-primary cursor-pointer"
                />
                <label htmlFor="variant-active" className="font-inter text-sm font-semibold text-lumina-text cursor-pointer select-none">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-lumina-outline/60 hover:bg-lumina-surface-alt text-lumina-text font-inter font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-3 rounded-lg transition-colors shadow-lumina-sm"
                >
                  {editingVariant ? 'Update' : 'Create'}
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

export default AdminABTesting;
