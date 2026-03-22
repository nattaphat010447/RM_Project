import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyProfile = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    address: '',
    password: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    fetch(`${API_URL}/api/users/profile/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/signin';
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setFormData({
          username: data.username || '',
          email: data.email || '',
          fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          phone: data.phone || '',
          address: data.address || '',
          password: ''
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [navigate, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');

    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      first_name: firstName,
      last_name: lastName,
      phone: formData.phone,
      address: formData.address,
    };

    if (formData.password.trim() !== '') {
      payload.password = formData.password;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/profile/`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert("Profile updated successfully!");
        setFormData({...formData, password: ''});
      } else {
        alert(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      alert("System error");
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center font-bold text-gray-500 bg-gray-50">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        
        <div className="bg-[#2d116c] px-8 py-6 text-white">
          <h1 className="text-3xl font-black tracking-wide">My Profile</h1>
          <p className="text-purple-200 mt-1">Manage your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-100 p-6 rounded-xl border border-gray-200">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">Username</label>
              <input 
                type="text" 
                value={formData.username} 
                disabled 
                className="w-full bg-gray-200 border border-gray-300 text-gray-500 rounded-lg px-4 py-2 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                disabled 
                className="w-full bg-gray-200 border border-gray-300 text-gray-500 rounded-lg px-4 py-2 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input 
                type="text" required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Shipping / Contact Address</label>
            <textarea 
              required rows="3"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition resize-none"
            ></textarea>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-4">
            <label className="block text-sm font-bold text-yellow-800 mb-2">New Password (optional)</label>
            <input 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Leave blank if you do not want to change your password"
              className="w-full border-2 border-yellow-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition"
            />
            <p className="text-xs text-yellow-600 mt-2 font-medium">If you fill this field, your current password will be replaced when you save.</p>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-black text-lg py-3.5 rounded-xl shadow-md transition duration-200 transform hover:-translate-y-0.5">
              Save Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MyProfile;