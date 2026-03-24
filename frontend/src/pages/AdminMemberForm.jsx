import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AdminMemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    password: ''
  });

  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const token = localStorage.getItem('access_token');
      fetch(`${API_URL}/api/admin/users/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setFormData({
            username: data.username || '',
            fullName: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            dob: data.dob || '',
            password: ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id, API_URL, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');

    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      username: formData.username,
      first_name: firstName,
      last_name: lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      dob: formData.dob
    };

    if (!isEditMode || (isEditMode && formData.password)) {
      payload.password = formData.password;
    }

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${API_URL}/api/admin/users/${id}/` : `${API_URL}/api/admin/users/`;

      const response = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(isEditMode ? "Changes saved successfully" : "Member added successfully");
        navigate('/admin/members');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || Object.values(errorData).flat().join('\n') || "An error occurred. Please verify the input.";
        alert(`Error:\n${errorMessage}`);
      }
    } catch (err) { 
        alert("System error: " + err.message); 
    }
  };

  if (loading) return <div className="min-h-screen bg-brand-light flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-brand-light p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-brand-light rounded-3xl shadow-md p-8 md:p-12">
        <h1 className="text-2xl font-bold text-brand-primary mb-8 border-b pb-4">
          {isEditMode ? 'Edit Member' : 'Add New Member'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-brand-primary mb-2">Username *</label>
            <input 
              type="text" required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
              placeholder="Enter a unique username"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-primary mb-2">Full Name *</label>
              <input 
                type="text" required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
                placeholder="Enter first and last name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-primary mb-2">Date of Birth *</label>
              <input 
                type="date" required
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-primary mb-2">Email *</label>
              <input 
                type="email" required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
                placeholder="Enter member email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-primary mb-2">Phone *</label>
              <input 
                type="text" required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-primary mb-2">Address *</label>
            <textarea 
              required
              rows="3"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md resize-none"
              placeholder="Enter member address"
            ></textarea>
          </div>

          <div className="bg-brand-light rounded-lg p-5 mt-8 shadow-md">
            <label className="block text-sm font-bold text-brand-primary mb-2">
              Password {isEditMode ? '(enter only if you want to change it)' : '*'}
            </label>
            <input 
              type="password"
              required={!isEditMode}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={isEditMode ? "Leave empty to keep current password" : "Set a password..."}
              className="w-full rounded-lg px-4 py-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-brand-light shadow-md"
            />
          </div>

          <div className="flex justify-between items-center mt-10 pt-6 border-t">
            <button type="button" onClick={() => navigate('/admin/members')} className="border border-brand-secondary hover:bg-brand-light text-brand-primary font-bold py-2 px-6 rounded-lg transition">
              ← Back
            </button>
            <button type="submit" className="bg-brand-primary hover:bg-brand-primary text-brand-light font-bold py-2 px-6 rounded-lg transition shadow-md">
              {isEditMode ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AdminMemberForm;