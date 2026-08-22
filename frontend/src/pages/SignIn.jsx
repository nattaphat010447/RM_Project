import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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

        if (!profileRes.ok) {
          alert("Login succeeded but couldn't load your profile. Please try again.");
          return;
        }
        const profile = await profileRes.json();

        localStorage.setItem('user_role', profile.role);

        if (profile.role === 'ADMIN') {
          // Navbar re-reads localStorage on route change (see its
          // useEffect keyed on `location`), so navigate() alone is enough -
          // no reload() needed, and reload() would race/abort navigate()'s
          // client-side route change anyway.
          navigate('/admin/dashboard');
          return;
        }

        // Check if user has preferences (for new users)
        const prefsRes = await fetch(`${API_URL}/api/preferences/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });

        if (!prefsRes.ok) {
          // Can't confirm preference state - default to the safer path
          // (home) rather than guessing has_preferences from a broken response.
          navigate('/');
          return;
        }
        const prefsData = await prefsRes.json();

        navigate(prefsData.has_preferences ? '/' : '/onboarding');
      } else {
        alert("Invalid credentials");
      }
    } catch {
      alert("Login failed");
    }
  };

  const inputClass = "w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow";

  return (
    <div className="min-h-screen flex items-center justify-center bg-lumina-surface px-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-lumina-lg border border-lumina-outline/40 w-full max-w-md">

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-lumina-primary-soft flex items-center justify-center">
            <svg className="w-7 h-7 text-lumina-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
        </div>

        <h2 className="font-jakarta text-3xl font-extrabold text-center text-lumina-text mb-2 tracking-tight">Sign In</h2>
        <p className="font-jakarta text-sm text-lumina-text-muted text-center mb-8">Welcome back to MangaFlow.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className={inputClass}
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
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-3.5 rounded-lg transition-colors duration-200 shadow-lumina-sm mt-2"
          >
            Sign In
          </button>
        </form>

        <p className="font-inter text-sm text-lumina-text-muted text-center mt-6">
          New to MangaFlow?{' '}
          <Link to="/signup" className="font-semibold text-lumina-primary hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
