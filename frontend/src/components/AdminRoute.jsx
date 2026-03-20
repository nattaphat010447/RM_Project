import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/me/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.role === 'ADMIN') {
            setIsAdmin(true);
            localStorage.setItem('user_role', 'ADMIN');
          } else {
            setIsAdmin(false);
            localStorage.setItem('user_role', 'CUSTOMER');
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Security Check Error:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [API_URL]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900 mb-4"></div>
          <p className="text-gray-600 font-bold">Checking security permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // alert("Access Denied");
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;