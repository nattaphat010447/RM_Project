import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path 
      ? "text-purple-600 border-b-2 border-purple-600 pb-1" 
      : "text-gray-500 hover:text-purple-600 transition";
  };

  return (
    <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-2xl font-black text-blue-600 tracking-wider">
        <Link to="/">Comic</Link>
      </div>
      
      <div className="hidden md:flex space-x-8 font-medium">
        <Link to="/" className={isActive('/')}>Home</Link>
        <Link to="/search" className={isActive('/search')}>Search</Link>
        <Link to="/foryou" className={isActive('/foryou')}>For You</Link>
        <Link to="/popular" className={isActive('/popular')}>Popular</Link>
        <Link to="/cart" className={isActive('/cart')}>Cart</Link>
      </div>
      
      {isLoggedIn ? (
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-purple-200">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-semibold text-gray-700 hidden sm:block">karntima</span>
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