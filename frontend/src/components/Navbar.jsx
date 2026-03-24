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
      ? "text-brand-secondary border-b-2 border-brand-secondary pb-1 font-bold" 
      : "text-brand-primary hover:text-brand-secondary transition font-medium";
  };

  return (
    <nav className="bg-brand-light border-b border-brand-secondary px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-2xl font-bold text-brand-primary tracking-wide">
        <Link to="/">MyManga</Link>
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
            <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center border-2 border-brand-secondary hover:border-brand-accent transition">
              <span className="text-brand-primary font-bold">Me</span>
            </div>
          </div>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-brand-light rounded-xl shadow-lg py-2 z-50 border border-brand-secondary">
              <Link to="/profile" className="block px-5 py-3 text-sm text-brand-primary hover:bg-brand-light hover:text-brand-secondary font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Profile</Link>
              <Link to="/cart" className="block px-5 py-3 text-sm text-brand-primary hover:bg-brand-light hover:text-brand-secondary font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Cart</Link>
              <Link to="/orders" className="block px-5 py-3 text-sm text-brand-primary hover:bg-brand-light hover:text-brand-secondary font-medium transition" onClick={() => setIsDropdownOpen(false)}>My Orders</Link>
              
              {userRole === 'ADMIN' && (
                <>
                  <div className="border-t border-brand-secondary my-1"></div>
                  <Link 
                    to="/admin/dashboard" 
                    className="block px-5 py-3 text-sm text-brand-secondary hover:bg-brand-light font-medium transition" 
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                </>
              )}

              <div className="border-t border-brand-secondary my-1"></div>
              <button onClick={handleLogout} className="block w-full text-left px-5 py-3 text-sm text-brand-secondary hover:bg-brand-light font-medium transition">Logout</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Link to="/signin" className="text-brand-primary border border-brand-primary font-medium hover:text-brand-secondary hover:border-brand-secondary py-2 px-6 rounded-lg transition">Sign In</Link>
          <Link to="/signup" className="bg-brand-secondary hover:bg-brand-primary text-brand-light font-semibold py-2 px-6 rounded-lg transition shadow-sm">Sign Up</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;