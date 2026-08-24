import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const AdminMLTraining = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [logs, setLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) interval = setInterval(fetchStatus, 5000);
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/ml/status/`);
      const data = await response.json();
      setLogs(data.logs || []);
      setIsTraining(data.is_training || false);
      setLoading(false);
      if (data.is_training) setAutoRefresh(true);
    } catch {
      setLoading(false);
    }
  };

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
      case 'PENDING':   return <span className={`${base} bg-yellow-100 text-yellow-700`}>Pending</span>;
      case 'RUNNING':   return <span className={`${base} bg-blue-100 text-blue-700 animate-pulse`}>Running</span>;
      case 'COMPLETED': return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
      case 'FAILED':    return <span className={`${base} bg-red-100 text-red-700`}>Failed</span>;
      default:          return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
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
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-brand-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-primary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const latestLog = logs[0];
  const latestV1 = logs.find(l => l.model_name === 'MB-CGCN');
  const latestV2 = logs.find(l => l.model_name === 'MB-CGCN-v2');

  return (
    <div className="min-h-screen bg-brand-light p-4 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-brand-light rounded-lg px-6 py-3 mb-8 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')} className="text-brand-primary hover:text-brand-primary font-semibold text-sm">
              &larr; Back
            </button>
            <h1 className="text-2xl font-bold text-brand-primary">ML Model Training</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-brand-primary cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={fetchStatus}
              className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-2 px-4 rounded-lg transition text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-brand-light rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold text-brand-primary mb-4">Current Status</h2>

          {isTraining ? (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-5 flex items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 shrink-0"></div>
              <div>
                <p className="font-bold text-blue-700">Training in Progress...</p>
                <p className="text-sm text-blue-600 mt-1">Please wait. This may take 10-30 minutes.</p>
              </div>
            </div>
          ) : latestLog?.status === 'COMPLETED' ? (
            <div className="border border-green-200 bg-green-50 rounded-lg p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-green-700">Latest Training Completed</p>
                <p className="text-sm text-green-600 mt-1">Completed: {formatDate(latestLog.completed_at)}</p>
                {latestLog.final_recall_at_10 && (
                  <div className="mt-2 flex gap-6">
                    <span className="text-sm text-brand-primary">Recall@10: <strong>{(latestLog.final_recall_at_10 * 100).toFixed(2)}%</strong></span>
                    <span className="text-sm text-brand-primary">NDCG@10: <strong>{(latestLog.final_ndcg_at_10 * 100).toFixed(2)}%</strong></span>
                  </div>
                )}
              </div>
              <button onClick={() => handleRetrain('v1')} className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-2 px-5 rounded-lg transition text-sm">
                Retrain Now
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-brand-primary">Ready to Train</p>
                <p className="text-sm text-brand-primary mt-1">No training in progress</p>
              </div>
              <button
                onClick={() => handleRetrain('v1')}
                disabled={isTraining}
                className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-2 px-5 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retrain Now
              </button>
            </div>
          )}
        </div>

        {/* Model Comparison */}
        <div className="bg-brand-light rounded-xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-brand-primary">Model Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Model', 'Behaviors', 'Data Source', 'Status', 'Recall@10', 'NDCG@10', 'Trained At', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-brand-primary uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* v1 */}
                <tr className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <span className="font-bold text-brand-primary">MB-CGCN</span>
                    <span className="ml-2 text-xs text-gray-400">(Primary)</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-brand-primary">CART → RENT</td>
                  <td className="px-5 py-4 text-sm text-brand-primary">MAL Dataset + Web</td>
                  <td className="px-5 py-4">{latestV1 ? getStatusBadge(latestV1.status) : <span className="text-xs text-gray-400">Not trained</span>}</td>
                  <td className="px-5 py-4 text-sm font-bold text-brand-primary">{latestV1?.final_recall_at_10 ? `${(latestV1.final_recall_at_10 * 100).toFixed(2)}%` : '-'}</td>
                  <td className="px-5 py-4 text-sm font-bold text-brand-primary">{latestV1?.final_ndcg_at_10 ? `${(latestV1.final_ndcg_at_10 * 100).toFixed(2)}%` : '-'}</td>
                  <td className="px-5 py-4 text-sm text-brand-primary">{latestV1 ? formatDate(latestV1.completed_at) : '-'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleRetrain('v1')} disabled={isTraining} className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-1.5 px-4 rounded-lg transition text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                      Retrain
                    </button>
                  </td>
                </tr>
                {/* v2 */}
                <tr className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <span className="font-bold text-brand-primary">MB-CGCN-v2</span>
                    <span className="ml-2 text-xs text-gray-400">(Secondary)</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-brand-primary">CLICK → CART → RENT</td>
                  <td className="px-5 py-4 text-sm text-brand-primary">Web Only (3 behaviors)</td>
                  <td className="px-5 py-4">{latestV2 ? getStatusBadge(latestV2.status) : <span className="text-xs text-gray-400">Not trained</span>}</td>
                  <td className="px-5 py-4 text-sm font-bold text-brand-primary">{latestV2?.final_recall_at_10 ? `${(latestV2.final_recall_at_10 * 100).toFixed(2)}%` : '-'}</td>
                  <td className="px-5 py-4 text-sm font-bold text-brand-primary">{latestV2?.final_ndcg_at_10 ? `${(latestV2.final_ndcg_at_10 * 100).toFixed(2)}%` : '-'}</td>
                  <td className="px-5 py-4 text-sm text-brand-primary">{latestV2 ? formatDate(latestV2.completed_at) : '-'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleRetrain('v2')} disabled={isTraining} className="bg-brand-light shadow-md hover:shadow-lg text-brand-primary font-semibold py-1.5 px-4 rounded-lg transition text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                      Retrain
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {!latestV2 && (
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
              <p className="text-xs text-gray-500">
                <strong>MB-CGCN-v2</strong> requires at least 50+ CLICK interactions from the web before training.
              </p>
            </div>
          )}
        </div>

        {/* Training History */}
        <div className="bg-brand-light rounded-xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-brand-primary">Training History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['ID', 'Model', 'Status', 'Started', 'Duration', 'Users/Items', 'Recall@10', 'NDCG@10', 'Weights', 'Details'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-brand-primary uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-sm text-gray-400">No training history yet</td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 text-xs text-gray-400 font-mono">#{log.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-brand-primary">{log.model_name}</td>
                    <td className="px-5 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-5 py-4 text-sm text-brand-primary">{formatDate(log.started_at)}</td>
                    <td className="px-5 py-4 text-sm text-brand-primary">{getDuration(log.started_at, log.completed_at)}</td>
                    <td className="px-5 py-4 text-sm text-brand-primary">{log.num_users > 0 ? `${log.num_users} / ${log.num_items}` : '-'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-brand-primary">{log.final_recall_at_10 ? `${(log.final_recall_at_10 * 100).toFixed(2)}%` : '-'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-brand-primary">{log.final_ndcg_at_10 ? `${(log.final_ndcg_at_10 * 100).toFixed(2)}%` : '-'}</td>
                    <td className="px-5 py-4">
                      {log.metadata?.learned_weights ? (
                        <div className="text-xs text-brand-primary font-mono leading-relaxed">
                          <div>C: {(log.metadata.learned_weights.click * 100).toFixed(1)}%</div>
                          <div>Ca: {(log.metadata.learned_weights.cart * 100).toFixed(1)}%</div>
                          <div>R: {(log.metadata.learned_weights.rent * 100).toFixed(1)}%</div>
                        </div>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-4">
                      {log.error_message ? (
                        <button onClick={() => alert(`Error: ${log.error_message}`)} className="text-red-500 hover:text-red-400 text-xs font-bold underline">
                          View Error
                        </button>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-brand-light rounded-xl shadow-md p-6">
          <h3 className="text-base font-bold text-brand-primary mb-3">How It Works</h3>
          <ul className="space-y-1.5 text-sm text-brand-primary">
            <li>• Trains MB-CGCN from the latest Cart and Rental data.</li>
            <li>• Takes approximately 10-30 minutes depending on data size.</li>
            <li>• The model reloads automatically after training completes.</li>
            <li>• Recall@10 and NDCG@10 measure model accuracy (higher is better).</li>
            <li>• Recommended to retrain every 1-2 weeks or when significant new data is available.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default AdminMLTraining;
