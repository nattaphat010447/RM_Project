import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // เพิ่มการเก็บสถานะ Role
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role'); // ดึง Role มาจาก Storage
    
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
    localStorage.removeItem('user_role'); // เคลียร์ Role ออกตอน Logout
    setIsLoggedIn(false);
    setUserRole(null);
    setIsDropdownOpen(false);
    // alert("Logged out successfully!");
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path 
      ? "text-purple-600 border-b-2 border-purple-600 pb-1 font-bold" 
      : "text-gray-500 hover:text-purple-600 transition font-medium";
  };

  return (
    <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-2xl font-black text-indigo-900 tracking-wider">
        <Link to="/">ComicRental</Link>
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
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-indigo-200 hover:border-indigo-400 transition">
              <span className="text-indigo-800 font-black">Me</span>
            </div>
          </div>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100 transform origin-top-right transition-all">
              <Link to="/cart" className="block px-5 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 font-semibold" onClick={() => setIsDropdownOpen(false)}>My Cart</Link>
              <Link to="/orders" className="block px-5 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 font-semibold" onClick={() => setIsDropdownOpen(false)}>My Orders</Link>
              
              {userRole === 'ADMIN' && (
                <>
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link 
                    to="/admin/dashboard" 
                    className="block px-5 py-3 text-sm text-purple-700 hover:bg-purple-100 font-semibold" 
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                </>
              )}

              <div className="border-t border-gray-100 my-1"></div>
              <button onClick={handleLogout} className="block w-full text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 font-semibold">Logout</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Link to="/signin" className="text-gray-600 font-semibold hover:text-purple-600 transition">Sign In</Link>
          <Link to="/signup" className="bg-indigo-900 hover:bg-indigo-800 text-white font-semibold py-2 px-6 rounded-full transition duration-200 shadow-md">Sign Up</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;