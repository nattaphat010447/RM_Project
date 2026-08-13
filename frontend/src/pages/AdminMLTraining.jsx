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

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/ml/status/`);
      const data = await response.json();

      setLogs(data.logs || []);
      setIsTraining(data.is_training || false);
      setLoading(false);

      // Auto-enable refresh if training
      if (data.is_training) {
        setAutoRefresh(true);
      }
    } catch (err) {
      console.error(err);
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

      if (response.ok) {
        alert(data.message || 'Training started.');
        setAutoRefresh(true);
        fetchStatus();
      } else {
        alert(data.error || 'An error occurred.');
      }
    } catch (err) {
      console.error(err);
      alert('System error. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">⏳ Pending</span>;
      case 'RUNNING':
        return <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold animate-pulse">Running</span>;
      case 'COMPLETED':
        return <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">Completed</span>;
      case 'FAILED':
        return <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">Failed</span>;
      default:
        return <span className="inline-block px-3 py-1 bg-slate-600 text-slate-400 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return '-';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-900 text-white">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  const latestLog = logs[0];
  const latestV1 = logs.find(log => log.model_name === 'MB-CGCN');
  const latestV2 = logs.find(log => log.model_name === 'MB-CGCN-v2');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-cyan-400">Model Training</h1>
            <p className="text-slate-400 mt-1">Retrain MB-CGCN recommendation model</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
            <button
              onClick={() => fetchStatus()}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Current Status Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-100">Current Status</h2>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              Auto-refresh (5s)
            </label>
          </div>

          {isTraining ? (
            <div className="bg-blue-500/10 border-2 border-blue-500 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-400"></div>
                <div>
                  <h3 className="text-xl font-bold text-blue-400">Training in Progress...</h3>
                  <p className="text-slate-400 mt-1">Please wait. This may take 10-30 minutes.</p>
                </div>
              </div>
            </div>
          ) : latestLog?.status === 'COMPLETED' ? (
            <div className="bg-green-500/10 border-2 border-green-500 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-green-400">Latest Training Completed</h3>
                  <p className="text-slate-400 mt-1">Completed: {formatDate(latestLog.completed_at)}</p>
                  {latestLog.final_recall_at_10 && (
                    <div className="mt-3 flex gap-6">
                      <div>
                        <span className="text-slate-500 text-sm">Recall@10:</span>
                        <span className="ml-2 text-lg font-bold text-cyan-400">{(latestLog.final_recall_at_10 * 100).toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">NDCG@10:</span>
                        <span className="ml-2 text-lg font-bold text-cyan-400">{(latestLog.final_ndcg_at_10 * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRetrain('v1')}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-6 py-3 rounded-lg transition shadow-lg"
                >
                  Retrain Model Now
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-300">Ready to Train</h3>
                  <p className="text-slate-400 mt-1">No training in progress</p>
                </div>
                <button
                  onClick={() => handleRetrain('v1')}
                  disabled={isTraining}
                  className={`font-bold px-6 py-3 rounded-lg transition shadow-lg ${
                    isTraining
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-slate-900'
                  }`}
                >
                  Retrain Model Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Model Comparison Table */}
        <h2 className="text-2xl font-black text-slate-100 mb-4">Model Comparison</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase">Model</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Behaviors</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Data Source</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Recall@10</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">NDCG@10</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Trained At</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {/* MB-CGCN v1 (2 behaviors) */}
                <tr className="hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-bold text-cyan-400">MB-CGCN</span>
                      <span className="ml-2 text-xs text-slate-500">(Primary)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    CART → RENT
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    MAL Dataset + Web
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV1 ? getStatusBadge(latestV1.status) : <span className="text-slate-500 text-xs">Not trained</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV1?.final_recall_at_10 ? (
                      <span className="font-bold text-cyan-400">{(latestV1.final_recall_at_10 * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV1?.final_ndcg_at_10 ? (
                      <span className="font-bold text-cyan-400">{(latestV1.final_ndcg_at_10 * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    {latestV1 ? formatDate(latestV1.completed_at) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleRetrain('v1')}
                      disabled={isTraining}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        isTraining
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-cyan-500 hover:bg-cyan-600 text-slate-900'
                      }`}
                    >
                      Retrain
                    </button>
                  </td>
                </tr>

                {/* MB-CGCN v2 (3 behaviors) */}
                <tr className="hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-bold text-purple-400">MB-CGCN-v2</span>
                      <span className="ml-2 text-xs text-slate-500">(Secondary)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    CLICK → CART → RENT
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    Web Only (3 behaviors)
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV2 ? getStatusBadge(latestV2.status) : <span className="text-slate-500 text-xs">Not trained</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV2?.final_recall_at_10 ? (
                      <span className="font-bold text-purple-400">{(latestV2.final_recall_at_10 * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {latestV2?.final_ndcg_at_10 ? (
                      <span className="font-bold text-purple-400">{(latestV2.final_ndcg_at_10 * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">
                    {latestV2 ? formatDate(latestV2.completed_at) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleRetrain('v2')}
                      disabled={isTraining}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        isTraining
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      Retrain
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Info banner for v2 */}
          {!latestV2 && (
            <div className="bg-blue-500/10 border-t border-blue-500/30 p-4">
              <p className="text-sm text-blue-300">
                <strong>MB-CGCN-v2</strong> requires at least 50+ CLICK interactions from the web before training.
              </p>
            </div>
          )}
        </div>

        {/* Training History */}
        <h2 className="text-2xl font-black text-slate-100 mb-4">Training History</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase">Model</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Started</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Duration</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Users/Items</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Recall@10</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">NDCG@10</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Weights</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">#{log.id}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-100">{log.model_name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-300">{formatDate(log.started_at)}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-300">
                      {getDuration(log.started_at, log.completed_at)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-300">
                      {log.num_users > 0 ? `${log.num_users} / ${log.num_items}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.final_recall_at_10 ? (
                        <span className="font-bold text-cyan-400">{(log.final_recall_at_10 * 100).toFixed(2)}%</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.final_ndcg_at_10 ? (
                        <span className="font-bold text-cyan-400">{(log.final_ndcg_at_10 * 100).toFixed(2)}%</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.metadata?.learned_weights ? (
                        <div className="text-xs text-slate-300 font-mono">
                          <div>C: {(log.metadata.learned_weights.click * 100).toFixed(1)}%</div>
                          <div>Ca: {(log.metadata.learned_weights.cart * 100).toFixed(1)}%</div>
                          <div>R: {(log.metadata.learned_weights.rent * 100).toFixed(1)}%</div>
                        </div>
                      ) : log.model_name?.includes('v2') ? (
                        <span className="text-slate-500 text-xs">Fixed</span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.error_message ? (
                        <button
                          onClick={() => alert(`Error: ${log.error_message}`)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold underline"
                        >
                          View Error
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-3">How It Works</h3>
          <ul className="space-y-2 text-sm text-slate-400">
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
