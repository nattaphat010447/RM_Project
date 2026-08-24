import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Discover' },
  { to: '/foryou', label: 'For You' },
  { to: '/popular', label: 'Popular' },
];

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
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
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path
      ? "text-lumina-primary border-b-2 border-lumina-primary pb-1 font-semibold"
      : "text-lumina-text-muted hover:text-lumina-primary transition font-medium";
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = navSearch.trim();
    setIsMobileMenuOpen(false);
    if (!query) {
      if (location.pathname !== '/search') navigate('/search');
      return;
    }
    setNavSearch('');
    navigate(`/search?query=${encodeURIComponent(query)}`);
  };

  const searchField = (
    <div className="relative w-full">
      <svg className="w-4 h-4 text-lumina-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      <input
        type="text"
        placeholder="Search manga..."
        value={navSearch}
        onChange={(e) => setNavSearch(e.target.value)}
        aria-label="Search manga"
        className="w-full bg-white border border-lumina-outline/60 rounded-full pl-10 pr-4 py-2 font-inter text-sm text-lumina-text placeholder:text-lumina-text-muted/60 shadow-lumina-sm focus:outline-none focus:border-lumina-primary focus:ring-1 focus:ring-lumina-primary transition-shadow"
      />
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-lumina-surface/80 backdrop-blur-md shadow-lumina-sm">
      <div className="max-w-screen-xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-10 min-w-0">
          <Link to="/" className="font-jakarta text-xl font-extrabold tracking-tight text-lumina-primary shrink-0">
            SukiManga
          </Link>

          <div className="hidden md:flex items-center gap-7 font-inter text-sm">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={isActive(link.to)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} role="search" className="hidden md:flex flex-1 min-w-0 max-w-md mx-auto">
          {searchField}
        </form>

        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-label="Account menu"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-lumina-surface-alt text-lumina-primary hover:bg-lumina-primary-soft transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-lumina-surface-card rounded-2xl shadow-lumina-lg py-2 z-50 border border-lumina-outline/40 overflow-hidden">
                  <Link to="/profile" className="block px-5 py-3 font-inter text-sm text-lumina-text hover:bg-lumina-surface-alt hover:text-lumina-primary transition-colors" onClick={() => setIsDropdownOpen(false)}>My Profile</Link>
                  <Link to="/cart" className="block px-5 py-3 font-inter text-sm text-lumina-text hover:bg-lumina-surface-alt hover:text-lumina-primary transition-colors" onClick={() => setIsDropdownOpen(false)}>My Cart</Link>
                  <Link to="/orders" className="block px-5 py-3 font-inter text-sm text-lumina-text hover:bg-lumina-surface-alt hover:text-lumina-primary transition-colors" onClick={() => setIsDropdownOpen(false)}>My Orders</Link>

                  {userRole === 'ADMIN' && (
                    <>
                      <div className="border-t border-lumina-outline/40 my-1"></div>
                      <Link
                        to="/admin/dashboard"
                        className="block px-5 py-3 font-inter text-sm font-semibold text-lumina-primary hover:bg-lumina-primary-soft transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    </>
                  )}

                  <div className="border-t border-lumina-outline/40 my-1"></div>
                  <button onClick={handleLogout} className="block w-full text-left px-5 py-3 font-inter text-sm font-medium text-status-overdue hover:bg-lumina-surface-alt transition-colors">Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/signin" className="font-inter text-sm font-semibold text-lumina-primary border border-lumina-primary hover:bg-lumina-primary-soft px-6 py-2 rounded-lg transition-colors">Sign In</Link>
              <Link to="/signup" className="font-inter text-sm font-semibold bg-lumina-primary hover:bg-lumina-primary-light text-white px-6 py-2 rounded-lg shadow-lumina-sm transition-colors">Sign Up</Link>
            </div>
          )}

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-lumina-surface-alt text-lumina-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-lumina-surface-card border-t border-lumina-outline/40 shadow-lumina-lg">
          <div className="px-6 py-4 flex flex-col gap-1 font-inter text-sm">
            <form onSubmit={handleSearchSubmit} role="search" className="mb-3">
              {searchField}
            </form>
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={closeMobileMenu} className={`${isActive(link.to)} block py-2`}>
                {link.label}
              </Link>
            ))}

            {!isLoggedIn && (
              <>
                <div className="border-t border-lumina-outline/40 my-2"></div>
                <Link to="/signin" onClick={closeMobileMenu} className="block py-2 text-lumina-primary font-semibold">Sign In</Link>
                <Link to="/signup" onClick={closeMobileMenu} className="block py-2 text-lumina-primary font-semibold">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
