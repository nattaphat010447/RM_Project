import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    
    try {
      const response = await fetch(`${API_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);

        const profileRes = await fetch(`${API_URL}/api/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        const profile = await profileRes.json();
        
        localStorage.setItem('user_role', profile.role);

        if (profile.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
        window.location.reload(); 
      } else {
        alert("Invalid credentials");
      }
    } catch (error) {
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="bg-brand-light p-8 rounded-xl shadow-lg border border-brand-primary w-full max-w-md">
        
        <div className="flex justify-center mb-4">
          <div className="bg-brand-light p-4 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-brand-primary mb-8">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="input-modern"
              required
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="input-modern"
              required
            />
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="btn-primary-modern px-8 py-2 rounded-lg font-semibold"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;