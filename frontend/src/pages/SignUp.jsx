import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
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

  return (
    <div className="min-h-screen bg-brand-light py-12 px-4 flex justify-center items-center">
      <div className="bg-brand-light p-8 rounded-xl shadow-lg border border-brand-primary w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center text-brand-primary mb-8 tracking-tight">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-xs font-semibold text-brand-primary uppercase tracking-wide border-b border-brand-primary pb-2">Account Info</div>
            <input type="text" name="username" placeholder="Username" onChange={handleChange} required className="input-modern" />
            <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className="input-modern" />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="input-modern" />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required className="input-modern" />
          </div>

          {/* Section 2: Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-xs font-semibold text-brand-primary uppercase tracking-wide border-b border-brand-primary pb-2 mt-4">Personal Info</div>
            <input type="text" name="first_name" placeholder="First Name" onChange={handleChange} className="input-modern" />
            <input type="text" name="last_name" placeholder="Last Name" onChange={handleChange} className="input-modern" />
            <input type="tel" name="phone" placeholder="Phone Number (e.g. 0812345678)" onChange={handleChange} className="input-modern" />
            <div className="flex flex-col">
              <label className="text-xs text-brand-primary ml-2 mb-1 font-medium">Date of Birth</label>
              <input type="date" name="dob" onChange={handleChange} className="input-modern" />
            </div>
            <div className="md:col-span-2">
              <textarea name="address" placeholder="Shipping Address" rows="2" onChange={handleChange} className="input-modern"></textarea>
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-secondary hover:bg-brand-primary text-brand-light font-bold py-3 rounded-lg transition duration-300 shadow-sm mt-6">
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;