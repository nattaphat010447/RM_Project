import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const AdminMLTraining = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [logs, setLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

const fetchStatus = useCallback(async () => {
  try {
    const response = await authFetch(`${API_URL}/api/admin/ml/status/`);
    const data = await response.json();

    setLogs(data.logs || []);
    setIsTraining(data.is_training || false);
    setLoading(false);

    if (data.is_training) {
      setAutoRefresh(true);
    }
  } catch {
    setLoading(false);
  }
}, [API_URL]);

useEffect(() => {
  const t = setTimeout(fetchStatus, 0);
  return () => clearTimeout(t);
}, [fetchStatus]);

useEffect(() => {
  let interval;

  if (autoRefresh) {
    interval = setInterval(() => {
      fetchStatus();
    }, 5000);
  }

  return () => {
    if (interval) {
      clearInterval(interval);
    }
  };
}, [autoRefresh, fetchStatus]);

  const handleRetrain = async (modelVersion = 'v1') => {
    const modelName = modelVersion === 'v1' ? 'MB-CGCN (2 behaviors)' : 'MB-CGCN-v2 (3 behaviors)';
    if (!confirm(`Confirm training ${modelName}? This may take 10-30 minutes.`)) return;
    try {
      const response = await authFetch(`${API_URL}/api/admin/ml/retrain/?model=${modelVersion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) { setAutoRefresh(true); fetchStatus(); }
      else { alert(data.error || 'An error occurred.'); }
    } catch {
      alert('System error. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
  const base = 'inline-block px-3 py-1 rounded-full text-xs font-bold';

  switch (status) {
    case 'PENDING':
      return (
        <span className={`${base} badge-warning`}>
          ⏳ Pending
        </span>
      );

    case 'RUNNING':
      return (
        <span className={`${base} badge-info animate-pulse`}>
          Running
        </span>
      );

    case 'COMPLETED':
      return (
        <span className={`${base} badge-success`}>
          Completed
        </span>
      );

    case 'FAILED':
      return (
        <span className={`${base} badge-danger`}>
          Failed
        </span>
      );

    default:
      return (
        <span className={`${base} badge-neutral`}>
          {status}
        </span>
      );
  }
};

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return '-';

  const ms = new Date(endStr) - new Date(startStr);

  return `${Math.floor(ms / 60000)}m ${Math.floor(
    (ms % 60000) / 1000
  )}s`;
};

if (loading) {
  return (
    <div className="min-h-screen bg-lumina-surface flex items-center justify-center font-jakarta font-semibold text-xl text-lumina-text-muted">
      Loading training status...
    </div>
  );
}

  const latestLog = logs[0];
  const latestV1 = logs.find(l => l.model_name === 'MB-CGCN');
  const latestV2 = logs.find(l => l.model_name === 'MB-CGCN-v2');

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
    <button
      onClick={() => navigate('/admin/dashboard')}
      className="flex items-center gap-3 px-2 pt-2 pb-6 text-left w-full"
    >
      <div className="w-10 h-10 rounded-full bg-lumina-primary flex items-center justify-center shrink-0">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>

      <div className="min-w-0">
        <h1 className="font-jakarta font-bold text-lg text-lumina-primary truncate">
          MangaAdmin
        </h1>
        <p className="font-inter text-xs text-lumina-text-muted truncate">
          Central Management
        </p>
      </div>
    </button>

    <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map(item => {
        const isActive = item.path === '/admin/ml-training';

        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setSidebarOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-inter text-sm transition-colors duration-200 text-left ${
              isActive
                ? 'bg-lumina-primary-soft text-lumina-primary font-semibold'
                : 'text-lumina-text-muted hover:bg-white hover:text-lumina-text'
            }`}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              {item.icon}
            </svg>
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
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
          />
        </svg>
        Back to Storefront
      </button>
    </div>
  </div>
);

const thClass =
  "px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-wider text-lumina-text-muted";

const tdCenterClass =
  "px-5 py-4 text-center font-inter text-sm text-lumina-text";

return (
  <div className="min-h-screen bg-lumina-surface">
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 z-40">
      {sidebarContent}
    </aside>

    {sidebarOpen && (
      <div className="md:hidden fixed inset-0 z-50 flex">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        ></div>

        <div className="relative w-64 max-w-[80vw] h-full shadow-lumina-lg">
          {sidebarContent}
        </div>
      </div>
    )}

    <main className="md:ml-64 min-h-screen p-4 md:p-8 lg:p-10">
      <header className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h2 className="font-jakarta font-extrabold tracking-tight text-3xl md:text-4xl text-lumina-text">
            Model Training
          </h2>

          <p className="font-jakarta text-base text-lumina-text-muted mt-1">
            Retrain MB-CGCN recommendation model.
          </p>
        </div>

        <div className="flex items-start gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white border border-lumina-outline/50 text-lumina-primary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <button
            onClick={() => fetchStatus()}
            className="inline-flex items-center gap-2 border border-lumina-outline/60 hover:bg-white bg-white/60 text-lumina-text font-inter text-sm font-semibold px-5 py-2.5 rounded-full shadow-lumina-sm transition-colors whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Current Status */}
      <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-7 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="font-jakarta font-bold text-xl text-lumina-text">
            Current Status
          </h3>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-inter text-sm text-lumina-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded accent-lumina-primary"
              />
              Auto-refresh (5s)
            </label>

            <button
              onClick={fetchStatus}
              className="inline-flex items-center gap-2 border border-lumina-outline/60 hover:bg-white bg-white/60 text-lumina-text font-inter text-sm font-semibold px-4 py-2 rounded-full shadow-lumina-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Current Status */}
        <div className="bg-brand-light rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold text-brand-primary mb-4">Current Status</h2>

          {isTraining ? (
            <div className="bg-status-requested/10 border border-status-requested/40 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-status-requested shrink-0"></div>

                <div>
                  <h4 className="font-jakarta font-bold text-xl text-status-requested">
                    Training in Progress...
                  </h4>

                  <p className="font-inter text-sm text-lumina-text-muted mt-1">
                    Please wait. This may take 10-30 minutes.
                  </p>
                </div>
              </div>
            </div>
          ) : latestLog?.status === 'COMPLETED' ? (
            <div className="bg-status-available/10 border border-status-available/40 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-jakarta font-bold text-xl text-status-available">
                    Latest Training Completed
                  </h4>

                  <p className="font-inter text-sm text-lumina-text-muted mt-1">
                    Completed: {formatDate(latestLog.completed_at)}
                  </p>

                  {latestLog.final_recall_at_10 && (
                    <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-inter text-sm text-lumina-text-muted">
                          Recall@10:
                        </span>

                        <span className="ml-2 font-jakarta font-extrabold text-lg text-lumina-primary">
                          {(latestLog.final_recall_at_10 * 100).toFixed(2)}%
                        </span>
                      </div>

                      <div>
                        <span className="font-inter text-sm text-lumina-text-muted">
                          NDCG@10:
                        </span>

                        <span className="ml-2 font-jakarta font-extrabold text-lg text-lumina-primary">
                          {(latestLog.final_ndcg_at_10 * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleRetrain('v1')}
                  className="bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold px-6 py-3 rounded-lg transition-colors shadow-lumina-sm whitespace-nowrap"
                >
                  Retrain Model Now
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-lumina-surface-alt border border-lumina-outline/50 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-jakarta font-bold text-xl text-lumina-text">
                    Ready to Train
                  </h4>

                  <p className="font-inter text-sm text-lumina-text-muted mt-1">
                    No training in progress
                  </p>
                </div>

                <button
                  onClick={() => handleRetrain('v1')}
                  disabled={isTraining}
                  className={`font-inter font-semibold px-6 py-3 rounded-lg transition-colors shadow-lumina-sm whitespace-nowrap ${
                    isTraining
                      ? 'bg-lumina-primary-light opacity-70 text-white cursor-not-allowed'
                      : 'bg-lumina-primary hover:bg-lumina-primary-light text-white'
                  }`}
                >
                  Retrain Model Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-jakarta font-extrabold text-2xl text-lumina-text mb-4">
        Model Comparison
      </h3>

      <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="border-b border-lumina-outline/40 bg-lumina-surface-alt/60">
                <th className={thClass}>Model</th>
                <th className={`${thClass} text-center`}>Behaviors</th>
                <th className={`${thClass} text-center`}>Data Source</th>
                <th className={`${thClass} text-center`}>Status</th>
                <th className={`${thClass} text-center`}>Recall@10</th>
                <th className={`${thClass} text-center`}>NDCG@10</th>
                <th className={`${thClass} text-center`}>Trained At</th>
                <th className={`${thClass} text-center`}>Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-lumina-outline/30">
              <tr className="hover:bg-lumina-surface-alt/60 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-jakarta font-bold text-lumina-primary">MB-CGCN</span>
                  <span className="ml-2 font-inter text-xs text-lumina-text-muted">(Primary)</span>
                </td>

                <td className={tdCenterClass}>CART → RENT</td>
                <td className={tdCenterClass}>MAL Dataset + Web</td>

                <td className="px-5 py-4 text-center">
                  {latestV1 ? (
                    getStatusBadge(latestV1.status)
                  ) : (
                    <span className="font-inter text-xs text-lumina-text-muted">Not trained</span>
                  )}
                </td>

                <td className="px-5 py-4 text-center">
                  {latestV1?.final_recall_at_10 ? (
                    <span className="font-inter text-sm font-bold text-lumina-primary">
                      {(latestV1.final_recall_at_10 * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="font-inter text-sm text-lumina-text-muted">-</span>
                  )}
                </td>

                <td className="px-5 py-4 text-center">
                  {latestV1?.final_ndcg_at_10 ? (
                    <span className="font-inter text-sm font-bold text-lumina-primary">
                      {(latestV1.final_ndcg_at_10 * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="font-inter text-sm text-lumina-text-muted">-</span>
                  )}
                </td>

                <td className={`${tdCenterClass} whitespace-nowrap`}>
                  {latestV1 ? formatDate(latestV1.completed_at) : '-'}
                </td>

                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => handleRetrain('v1')}
                    disabled={isTraining}
                    className={`font-inter text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                      isTraining
                        ? 'bg-lumina-primary-light opacity-70 text-white cursor-not-allowed'
                        : 'bg-lumina-primary hover:bg-lumina-primary-light text-white'
                    }`}
                  >
                    Retrain
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-lumina-surface-alt/60 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-jakarta font-bold text-lumina-secondary">MB-CGCN-v2</span>
                  <span className="ml-2 font-inter text-xs text-lumina-text-muted">(Secondary)</span>
                </td>

                <td className={tdCenterClass}>CLICK → CART → RENT</td>
                <td className={tdCenterClass}>Web Only (3 behaviors)</td>

                <td className="px-5 py-4 text-center">
                  {latestV2 ? (
                    getStatusBadge(latestV2.status)
                  ) : (
                    <span className="font-inter text-xs text-lumina-text-muted">Not trained</span>
                  )}
                </td>

                <td className="px-5 py-4 text-center">
                  {latestV2?.final_recall_at_10 ? (
                    <span className="font-inter text-sm font-bold text-lumina-secondary">
                      {(latestV2.final_recall_at_10 * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="font-inter text-sm text-lumina-text-muted">-</span>
                  )}
                </td>

                <td className="px-5 py-4 text-center">
                  {latestV2?.final_ndcg_at_10 ? (
                    <span className="font-inter text-sm font-bold text-lumina-secondary">
                      {(latestV2.final_ndcg_at_10 * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="font-inter text-sm text-lumina-text-muted">-</span>
                  )}
                </td>

                <td className={`${tdCenterClass} whitespace-nowrap`}>
                  {latestV2 ? formatDate(latestV2.completed_at) : '-'}
                </td>

                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => handleRetrain('v2')}
                    disabled={isTraining}
                    className={`font-inter text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                      isTraining
                        ? 'bg-lumina-secondary-light opacity-70 text-white cursor-not-allowed'
                        : 'bg-lumina-secondary hover:bg-lumina-secondary-light text-white'
                    }`}
                  >
                    Retrain
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!latestV2 && (
          <div className="bg-status-requested/10 border-t border-status-requested/30 p-4">
            <p className="font-inter text-sm text-status-requested">
              <strong>MB-CGCN-v2</strong> requires at least 50+ CLICK interactions from the web before training.
            </p>
          </div>
        )}
      </div>

      <h3 className="font-jakarta font-extrabold text-2xl text-lumina-text mb-4">
        Training History
      </h3>

      <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1040px]">
            <thead>
              <tr className="border-b border-lumina-outline/40 bg-lumina-surface-alt/60">
                <th className={thClass}>ID</th>
                <th className={thClass}>Model</th>
                <th className={`${thClass} text-center`}>Status</th>
                <th className={`${thClass} text-center`}>Started</th>
                <th className={`${thClass} text-center`}>Duration</th>
                <th className={`${thClass} text-center`}>Users/Items</th>
                <th className={`${thClass} text-center`}>Recall@10</th>
                <th className={`${thClass} text-center`}>NDCG@10</th>
                <th className={`${thClass} text-center`}>Weights</th>
                <th className={`${thClass} text-center`}>Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-lumina-outline/30">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 font-jakarta text-lumina-text-muted italic text-center">
                    No training records yet
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-lumina-surface-alt/60 transition-colors">
                    <td className="px-5 py-4 font-inter text-sm text-lumina-text-muted">#{log.id}</td>
                    <td className="px-5 py-4 font-jakarta font-semibold text-sm text-lumina-text">{log.model_name}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(log.status)}</td>
                    <td className={`${tdCenterClass} whitespace-nowrap`}>{formatDate(log.started_at)}</td>
                    <td className={`${tdCenterClass} whitespace-nowrap`}>{getDuration(log.started_at, log.completed_at)}</td>
                    <td className={tdCenterClass}>{log.num_users > 0 ? `${log.num_users} / ${log.num_items}` : '-'}</td>

                    <td className="px-5 py-4 text-center">
                      {log.final_recall_at_10 ? (
                        <span className="font-inter text-sm font-bold text-lumina-primary">
                          {(log.final_recall_at_10 * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="font-inter text-sm text-lumina-text-muted">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {log.final_ndcg_at_10 ? (
                        <span className="font-inter text-sm font-bold text-lumina-primary">
                          {(log.final_ndcg_at_10 * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="font-inter text-sm text-lumina-text-muted">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {log.metadata?.learned_weights ? (
                        <div className="font-inter text-xs text-lumina-text-muted">
                          <div>C: {(log.metadata.learned_weights.click * 100).toFixed(1)}%</div>
                          <div>Ca: {(log.metadata.learned_weights.cart * 100).toFixed(1)}%</div>
                          <div>R: {(log.metadata.learned_weights.rent * 100).toFixed(1)}%</div>
                        </div>
                      ) : log.model_name?.includes('v2') ? (
                        <span className="font-inter text-xs text-lumina-text-muted">Fixed</span>
                      ) : (
                        <span className="font-inter text-xs text-lumina-text-muted">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {log.error_message ? (
                        <button
                          onClick={() => alert(`Error: ${log.error_message}`)}
                          className="font-inter text-xs font-semibold text-status-overdue hover:underline"
                        >
                          View Error
                        </button>
                      ) : (
                        <span className="font-inter text-xs text-lumina-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white/60 rounded-2xl border border-dashed border-lumina-outline/60 p-6">
        <h4 className="font-jakarta font-bold text-lg text-lumina-text mb-3">How It Works</h4>

        <ul className="space-y-2 font-inter text-sm text-lumina-text-muted">
          <li>• Trains MB-CGCN from the latest Cart and Rental data.</li>
          <li>• Takes approximately 10-30 minutes depending on data size.</li>
          <li>• The model reloads automatically after training completes.</li>
          <li>• Recall@10 and NDCG@10 measure model accuracy (higher is better).</li>
          <li>• Recommended to retrain every 1-2 weeks or when significant new data is available.</li>
        </ul>
      </div>
    </main>
  </div>
);
};

export default AdminMLTraining;