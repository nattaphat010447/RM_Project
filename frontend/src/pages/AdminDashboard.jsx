import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Rental Orders', path: '/admin/orders' },
    { title: 'Member Management', path: '/admin/members' },
    { title: 'Manga Management & In-Store Rental', path: '/admin/mangas' },
    { title: 'Rental History', path: '/admin/history' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-sm border border-slate-200 p-8 md:p-12 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </button>

        <h1 className="text-3xl font-semibold text-slate-900 text-center mb-10">Admin Dashboard</h1>

        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-full py-4 px-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition duration-200 text-slate-900 font-medium text-lg"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;