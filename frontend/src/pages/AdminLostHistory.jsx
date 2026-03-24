import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const AdminHistory = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const navigate = useNavigate();
  

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    fetch(`${API_URL}/api/admin/history/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/signin';
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setHistoryItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching history:", err);
        setLoading(false);
      });
  }, [navigate, API_URL]);

  const displayedItems = historyItems.filter(item => {
    const matchTab = activeTab === 'ALL' || item.item_status === 'LOST';
    if (!matchTab) return false;

    if (!searchQuery) return true;
    
    const lowerQuery = searchQuery.toLowerCase();
    
    const matchName = item.customer_name?.toLowerCase().includes(lowerQuery);
    const matchTitle = item.manga_title?.toLowerCase().includes(lowerQuery);
    const matchSerial = item.serial_no?.toLowerCase().includes(lowerQuery);
    const matchOrderId = item.order_id?.toString().includes(lowerQuery);

    return matchName || matchTitle || matchSerial || matchOrderId;
  });

  if (loading) return <div className="min-h-screen bg-brand-light flex justify-center items-center font-bold text-brand-primary">Loading history...</div>;

  return (
    <div className="min-h-screen bg-brand-light p-4 md:p-10 flex justify-center items-start pt-16">
      <div className="bg-brand-light rounded-3xl shadow-md w-full max-w-6xl p-8 md:p-10 relative">
        
        <div className="relative flex items-center justify-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 text-brand-primary hover:text-brand-primary transition duration-200"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-brand-primary text-center">
            Rental History
          </h1>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`px-8 py-2 rounded-full font-bold transition-all ${activeTab === 'ALL' ? 'bg-brand-primary text-brand-light shadow-md' : 'bg-brand-light text-brand-primary hover:bg-brand-light'}`} >
            All Records
          </button>
          <button 
            onClick={() => setActiveTab('LOST')}
            className={`px-8 py-2 rounded-full font-bold transition-all ${activeTab === 'LOST' ? 'bg-brand-accent text-brand-light shadow-md' : 'bg-brand-light text-brand-primary hover:bg-brand-light'}`} >
            Lost Records
          </button>
        </div>

        <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by customer, manga title, serial, or order ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm transition-shadow shadow-md text-brand-primary bg-brand-light"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-primary hover:text-brand-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b-2 border-brand-light text-brand-primary">
                <th className="py-4 px-4 font-bold">ID</th>
                <th className="py-4 px-4 font-bold">Customer</th>
                <th className="py-4 px-4 font-bold">Manga (Serial No)</th>
                <th className="py-4 px-4 font-bold">Rented At</th>
                <th className="py-4 px-4 font-bold">Due Date</th>
                <th className="py-4 px-4 font-bold">Returned At</th>
                <th className="py-4 px-4 font-bold">Return Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-brand-primary font-bold text-lg">No records in this category</td>
                </tr>
              ) : (
                displayedItems.map((item, index) => (
                  <tr key={index} className="border-b border-brand-light hover:bg-brand-light transition duration-150">
                    <td className="py-4 px-4 text-brand-primary">{item.order_id}</td>
                    <td className="py-4 px-4 text-brand-primary">{item.customer_name}</td>
                    <td className="py-4 px-4 font-medium text-brand-primary">
                      {item.manga_title} <span className="text-brand-primary">({item.serial_no})</span>
                    </td>
                    <td className="py-4 px-4 text-brand-primary">{item.rental_date_formatted}</td>
                    <td className="py-4 px-4 text-brand-primary">{item.due_at_formatted}</td>
                    <td className="py-4 px-4 font-bold text-brand-primary">{item.returned_at_formatted}</td>
                    <td className="py-4 px-4">
                      
                      {item.display_status === 'ON_TIME' && <span className="bg-brand-secondary text-brand-light px-3 py-1 rounded-md text-xs font-bold shadow-sm">On Time</span>}
                      {item.display_status === 'LATE' && <span className="bg-brand-primary text-brand-light px-3 py-1 rounded-md text-xs font-bold shadow-sm">Late</span>}
                      {item.item_status === 'LOST' && <span className="bg-brand-primary text-brand-light px-3 py-1 rounded-md text-xs font-bold shadow-sm">Lost</span>}
                      {item.item_status === 'CHECKED_OUT' && <span className="bg-brand-accent text-brand-light px-3 py-1 rounded-md text-xs font-bold shadow-sm">Checked Out</span>}

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default AdminHistory;