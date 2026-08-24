import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../api';

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

    authFetch(`${API_URL}/api/users/profile/`)
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/signin';
          throw new Error('Unauthorized');
        }
        if (!res.ok) {
          throw new Error('Failed to load profile.');
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
      const response = await authFetch(`${API_URL}/api/users/profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) return <div className="min-h-screen flex justify-center items-center font-jakarta font-semibold text-xl text-lumina-text-muted bg-lumina-surface">Loading profile...</div>;

  const inputClass = "w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow";
  const labelClass = "block font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted mb-2";
  const disabledClass = "w-full rounded-lg border border-lumina-outline/40 bg-lumina-surface-alt px-4 py-3 font-inter text-sm text-lumina-text-muted cursor-not-allowed";

  return (
    <div className="min-h-screen bg-lumina-surface py-12 md:py-16 px-4">
      <div className="max-w-2xl mx-auto">

        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-lumina-primary-soft flex items-center justify-center">
              <svg className="w-8 h-8 text-lumina-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>
          <h1 className="font-jakarta text-3xl md:text-4xl font-extrabold tracking-tight text-lumina-text">My Profile</h1>
          <p className="font-jakarta text-base text-lumina-text-muted mt-1">Manage your personal information.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8">
            <h2 className="font-jakarta font-bold text-lg text-lumina-text mb-5 pb-4 border-b border-lumina-outline/40">Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="profile-username" className={labelClass}>Username</label>
                <input id="profile-username" type="text" value={formData.username} disabled className={disabledClass} />
              </div>
              <div>
                <label htmlFor="profile-email" className={labelClass}>Email</label>
                <input id="profile-email" type="email" value={formData.email} disabled className={disabledClass} />
              </div>
            </div>
            <p className="font-inter text-xs text-lumina-text-muted mt-3">Username and email cannot be changed.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8">
            <h2 className="font-jakarta font-bold text-lg text-lumina-text mb-5 pb-4 border-b border-lumina-outline/40">Personal Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label htmlFor="profile-fullname" className={labelClass}>Full Name *</label>
                <input
                  id="profile-fullname"
                  type="text" required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className={labelClass}>Phone Number *</label>
                <input
                  id="profile-phone"
                  type="text" required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-address" className={labelClass}>Shipping / Contact Address *</label>
              <textarea
                id="profile-address"
                required rows="3"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={`${inputClass} resize-none`}
              ></textarea>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lumina-sm border border-lumina-outline/30 p-6 md:p-8">
            <h2 className="font-jakarta font-bold text-lg text-lumina-text mb-5 pb-4 border-b border-lumina-outline/40">Security</h2>
            <label htmlFor="profile-password" className={labelClass}>New Password (optional)</label>
            <input
              id="profile-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Leave blank if you do not want to change your password"
              className={inputClass}
            />
            <p className="font-inter text-xs text-lumina-text-muted mt-2">If you fill this field, your current password will be replaced when you save.</p>
          </div>

          <button type="submit" className="w-full bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold text-base py-3.5 rounded-xl transition-colors duration-200 shadow-lumina-sm">
            Save Profile
          </button>

          <div className="pt-2">
            <Link
              to="/onboarding"
              className="block w-full text-center border border-lumina-secondary/60 text-lumina-secondary hover:bg-lumina-secondary/10 font-inter font-semibold text-base py-3.5 rounded-xl transition-colors duration-200"
            >
              Recalibrate Manga Preferences
            </Link>
            <p className="font-inter text-xs text-lumina-text-muted text-center mt-2">
              Select 4 manga you like to get better recommendations
            </p>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MyProfile;
