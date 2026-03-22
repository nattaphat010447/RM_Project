import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    setIsLoggedIn(!!token);
    setUserRole(role);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    setIsLoggedIn(false);
    setUserRole(null);
    setIsDropdownOpen(false);
    // alert("Logged out successfully!");
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path 
      ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold" 
      : "text-slate-600 hover:text-blue-600 transition font-medium";
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-2xl font-bold text-slate-900 tracking-wide">
        <Link to="/">Rec & Rent Manga </Link>
      </div>
      
      <div className="hidden md:flex space-x-8">
        <Link to="/" className={isActive('/')}>Home</Link>
        <Link to="/search" className={isActive('/search')}>Search</Link>
        <Link to="/foryou" className={isActive('/foryou')}>For You</Link>
        <Link to="/popular" className={isActive('/popular')}>Popular</Link>
      </div>
      
      {isLoggedIn ? (
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200 hover:border-blue-400 transition">
              <span className="text-blue-900 font-bold">Me</span>
            </div>
          </div>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg py-2 z-50 border border-slate-200">
              <Link to="/profile" className="block px-5 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Profile</Link>
              <Link to="/cart" className="block px-5 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Cart</Link>
              <Link to="/orders" className="block px-5 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Orders</Link>
              
              {userRole === 'ADMIN' && (
                <>
                  <div className="border-t border-slate-200 my-1"></div>
                  <Link 
                    to="/admin/dashboard" 
                    className="block px-5 py-3 text-sm text-blue-600 hover:bg-blue-50 font-medium transition" 
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                </>
              )}

              <div className="border-t border-slate-200 my-1"></div>
              <button onClick={handleLogout} className="block w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-medium transition">Logout</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Link to="/signin" className="text-slate-600 font-medium hover:text-blue-600 transition">Sign In</Link>
          <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-sm">Sign Up</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;