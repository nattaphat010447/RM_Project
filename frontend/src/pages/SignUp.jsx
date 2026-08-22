import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    dob: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isValidPhone = (phone) => /^[0-9+\-\s]{9,15}$/.test(phone.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!isValidPhone(formData.phone)) {
      alert("Please enter a valid phone number (9-15 digits).");
      return;
    }

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const payload = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      address: formData.address,
    };
    if (formData.dob) {
      payload.dob = formData.dob;
    }

    try {
      const response = await fetch(`${API_URL}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Registration successful!");
        navigate('/signin');
      } else {
        const errorData = await response.json();
        alert("Error: " + JSON.stringify(errorData));
      }
    } catch (error) {
      console.error("Fetch Error: ", error);
      alert("System error. Please try again.");
    }
  };

  const sectionClass = "md:col-span-2 font-inter text-xs font-semibold uppercase tracking-wide text-lumina-text-muted border-b border-lumina-outline/60 pb-2";
  const inputClass = "w-full rounded-lg border border-lumina-outline/60 bg-white px-4 py-3 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow";

  return (
    <div className="min-h-screen bg-lumina-surface py-12 px-4 flex justify-center items-center">
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-lumina-lg border border-lumina-outline/40 w-full max-w-2xl">

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-lumina-primary-soft flex items-center justify-center">
            <svg className="w-7 h-7 text-lumina-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" /></svg>
          </div>
        </div>

        <h2 className="font-jakarta text-3xl font-extrabold text-center text-lumina-text mb-2 tracking-tight">Create Account</h2>
        <p className="font-jakarta text-sm text-lumina-text-muted text-center mb-8">Join MangaFlow and start your rental journey.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={sectionClass}>Account Info</div>
            <input type="text" name="username" placeholder="Username" onChange={handleChange} required className={inputClass} />
            <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className={inputClass} />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required className={inputClass} />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required className={inputClass} />
          </div>

          {/* Section 2: Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${sectionClass} mt-2`}>Personal Info</div>
            <input type="text" name="first_name" placeholder="First Name" onChange={handleChange} className={inputClass} />
            <input type="text" name="last_name" placeholder="Last Name" onChange={handleChange} className={inputClass} />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number (e.g. 0812345678)"
              onChange={handleChange}
              required
              pattern="[0-9+\-\s]{9,15}"
              title="Enter a valid phone number (9-15 digits, may include +, -, spaces)"
              className={inputClass}
            />
            <div className="flex flex-col">
              <label className="font-inter text-xs text-lumina-text-muted ml-1 mb-1 font-medium">Date of Birth</label>
              <input type="date" name="dob" onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <textarea name="address" placeholder="Shipping Address" rows="2" onChange={handleChange} className={`${inputClass} resize-none`}></textarea>
            </div>
          </div>

          <button type="submit" className="w-full bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold py-3.5 rounded-lg transition-colors duration-200 shadow-lumina-sm mt-4">
            Create Account
          </button>
        </form>

        <p className="font-inter text-sm text-lumina-text-muted text-center mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="font-semibold text-lumina-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
