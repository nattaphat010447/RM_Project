import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authFetch } from '../api';

const AdminABTesting = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [variants, setVariants] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      alert('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

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
        alert(data.message || 'บันทึกสำเร็จ');
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
      alert('ระบบขัดข้อง');
    }
  };

  const handleDelete = async (variantId) => {
    if (!confirm('ยืนยันการลบ variant นี้?')) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/ab-test/variants/?id=${variantId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'ลบสำเร็จ');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
      alert('ระบบขัดข้อง');
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
      <div className="min-h-screen flex justify-center items-center bg-slate-900 text-white">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  const totalTraffic = variants.reduce((sum, v) => sum + parseFloat(v.traffic_percentage || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-cyan-400">A/B Testing Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage recommendation algorithm experiments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
            <button
              onClick={openCreateModal}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-6 py-2 rounded-lg transition"
            >
              + Create Variant
            </button>
          </div>
        </div>

        {/* Traffic Warning */}
        {totalTraffic !== 100 && variants.filter(v => v.is_active).length > 0 && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-xl p-4 mb-6">
            <p className="text-orange-300 font-semibold">
              ⚠️ Traffic allocation: {totalTraffic.toFixed(1)}% (should be 100%)
            </p>
          </div>
        )}

        {/* Variants Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase">Variant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase">Algorithm</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Traffic %</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Users</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">CTR</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Conversion</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {variants.map(variant => {
                  const m = getMetricsForVariant(variant.id);
                  return (
                    <tr key={variant.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">{variant.name}</div>
                        {variant.description && (
                          <div className="text-xs text-slate-400 mt-1">{variant.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-cyan-400">{variant.algorithm}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-slate-100">{variant.traffic_percentage}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {variant.is_active ? (
                          <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-slate-600 text-slate-400 rounded-full text-xs font-bold">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-100 font-semibold">{m.unique_users}</td>
                      <td className="px-6 py-4 text-center text-slate-100 font-semibold">{m.ctr}%</td>
                      <td className="px-6 py-4 text-center text-slate-100 font-semibold">{m.conversion_rate}%</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(variant)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(variant.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition"
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

        {/* Detailed Metrics */}
        <h2 className="text-2xl font-black text-slate-100 mb-4">Detailed Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variants.map(variant => {
            const m = getMetricsForVariant(variant.id);
            return (
              <div key={variant.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">{variant.name}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Impressions:</span>
                    <span className="font-semibold text-slate-100">{m.impressions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clicks:</span>
                    <span className="font-semibold text-slate-100">{m.clicks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Add to Cart:</span>
                    <span className="font-semibold text-slate-100">{m.add_to_cart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rentals:</span>
                    <span className="font-semibold text-slate-100">{m.rentals}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-400">CTR:</span>
                    <span className="font-bold text-cyan-400">{m.ctr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conversion:</span>
                    <span className="font-bold text-green-400">{m.conversion_rate}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-black text-cyan-400 mb-6">
              {editingVariant ? 'Edit Variant' : 'Create Variant'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Algorithm</label>
                <select
                  value={formData.algorithm}
                  onChange={(e) => setFormData({...formData, algorithm: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-400"
                >
                  {algorithmChoices.map(choice => (
                    <option key={choice.value} value={choice.value}>{choice.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Traffic % (0-100)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={formData.traffic_percentage}
                  onChange={(e) => setFormData({...formData, traffic_percentage: parseFloat(e.target.value)})}
                  className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-sm font-bold text-slate-300">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-2 rounded-lg transition"
                >
                  {editingVariant ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminABTesting;
