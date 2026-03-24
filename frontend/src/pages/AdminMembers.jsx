import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchMembers = () => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/admin/users/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove member "${name}"? (data will be hidden from the system)`)) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("Member removed successfully");
        setMembers(members.filter(m => m.id !== id));
      } else {
        alert("Failed to remove member");
      }
    } catch (err) { alert("System error"); }
  };

  if (loading) return <div className="min-h-screen bg-brand-light flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-brand-light p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-brand-light rounded-3xl shadow-md p-8 relative">
        <button onClick={() => navigate('/admin/dashboard')} className="absolute top-6 left-6 text-brand-primary hover:text-brand-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <button onClick={() => navigate('/')} className="absolute top-6 right-6 text-brand-primary hover:text-brand-primary">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>

        <h1 className="text-2xl font-bold text-center text-brand-primary mb-8 mt-4">Member Management</h1>

        <div className="flex justify-end mb-4">
          <Link to="/admin/members/new" className="bg-brand-secondary hover:bg-brand-primary text-brand-light font-bold py-2 px-4 rounded-md text-sm shadow-md">
            + Add New Member
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg shadow-md">
          <table className="w-full text-center text-sm">
            <thead className="bg-brand-light border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-brand-primary">ID</th>
                <th className="px-4 py-3 font-bold text-brand-primary">Name</th>
                <th className="px-4 py-3 font-bold text-brand-primary">Email</th>
                <th className="px-4 py-3 font-bold text-brand-primary">Phone</th>
                <th className="px-4 py-3 font-bold text-brand-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-brand-light">
                  <td className="px-4 py-3 text-brand-primary">{member.id}</td>
                  <td className="px-4 py-3 text-brand-primary">{member.full_name}</td>
                  <td className="px-4 py-3 text-brand-primary">{member.email}</td>
                  <td className="px-4 py-3 text-brand-primary">{member.phone}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <Link to={`/admin/members/edit/${member.id}`} className="bg-brand-accent hover:bg-brand-accent text-brand-primary font-bold py-1 px-3 rounded text-xs shadow-sm">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(member.id, member.full_name)} className="bg-brand-primary hover:bg-brand-primary text-brand-light font-bold py-1 px-3 rounded text-xs shadow-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMembers;