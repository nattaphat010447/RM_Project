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
    
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
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
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex justify-center items-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-2xl">
        <h2 className="text-3xl font-black text-center text-indigo-900 mb-8 uppercase tracking-tighter">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Account Info</div>
            <input type="text" name="username" placeholder="Username" onChange={handleChange} required className="input-style" />
            <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className="input-style" />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="input-style" />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required className="input-style" />
          </div>

          {/* Section 2: Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mt-4">Personal Info</div>
            <input type="text" name="first_name" placeholder="First Name" onChange={handleChange} className="input-style" />
            <input type="text" name="last_name" placeholder="Last Name" onChange={handleChange} className="input-style" />
            <input type="tel" name="phone" placeholder="Phone Number (e.g. 0812345678)" onChange={handleChange} className="input-style" />
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 ml-2 mb-1">Date of Birth</label>
              <input type="date" name="dob" onChange={handleChange} className="input-style" />
            </div>
            <div className="md:col-span-2">
              <textarea name="address" placeholder="Shipping Address" rows="2" onChange={handleChange} className="input-style py-3"></textarea>
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-4 rounded-2xl transition duration-300 shadow-lg mt-6">
            SIGN UP NOW
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .input-style {
          width: 100%;
          background-color: #f3f4f6;
          color: #1f2937;
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .input-style:focus {
          outline: none;
          border-color: #4f46e5;
          background-color: #ffffff;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }
      `}} />
    </div>
  );
};

export default SignUp;