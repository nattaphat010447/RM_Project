import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchOrders = () => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/admin/orders/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [API_URL]);

  const handleAction = async (orderId, action) => {
    const token = localStorage.getItem('access_token');
    const confirmMsg = action === 'approve' ? "ยืนยันการอนุมัติคำขอนี้?" : 
                       action === 'reject' ? "ยืนยันการปฏิเสธคำขอนี้?" : 
                       "ยืนยันว่าลูกค้ารับหนังสือแล้ว?";
                       
    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/${action}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        fetchOrders();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("ระบบขัดข้อง");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-200 flex items-center justify-center">Loading...</div>;

  const requestedOrders = orders.filter(o => o.status === 'REQUESTED');
  const approvedOrders = orders.filter(o => o.status === 'APPROVED');
  const checkedOutOrders = orders.filter(o => o.status === 'CHECKED_OUT');

  return (
    <div className="min-h-screen bg-gray-200 p-4 md:p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-8 relative">
        
        <button onClick={() => navigate('/admin/dashboard')} className="absolute top-8 left-8 text-gray-600 hover:text-black">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <button onClick={() => navigate('/')} className="absolute top-8 right-8 text-gray-600 hover:text-black">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">รายการเช่าหนังสือ</h1>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">รายการคำขอเช่าหนังสือ</h2>
          {requestedOrders.length === 0 ? <p className="text-gray-400 text-center py-4">ไม่มีรายการคำขอใหม่</p> : (
            <div className="space-y-4">
              {requestedOrders.map(order => (
                <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-700">ลูกค้า: {order.customer_name}</p>
                    <p className="text-xs text-gray-500 mb-3">วันที่ขอ: {order.requested_at_formatted}</p>
                    <ul className="list-disc list-inside pl-4 text-sm text-gray-600">
                      {order.items.map(item => (
                        <li key={item.id}>{item.manga_title} - Serial No: <span className="font-semibold">{item.serial_no}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-3">
                    <button onClick={() => handleAction(order.id, 'approve')} className="bg-[#4CAF50] hover:bg-green-600 text-white font-bold py-2 px-6 rounded shadow-sm text-sm">อนุมัติ</button>
                    <button onClick={() => handleAction(order.id, 'reject')} className="bg-[#F44336] hover:bg-red-600 text-white font-bold py-2 px-6 rounded shadow-sm text-sm">ปฏิเสธ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">รายการรอลูกค้ามารับหนังสือ</h2>
          {approvedOrders.length === 0 ? <p className="text-gray-400 text-center py-4">ไม่มีรายการรอลูกค้ามารับ</p> : (
            <div className="space-y-4">
              {approvedOrders.map(order => (
                <div key={order.id} className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-indigo-900">ลูกค้า: {order.customer_name}</p>
                    <ul className="list-disc list-inside pl-4 text-sm text-indigo-700 mt-2">
                      {order.items.map(item => (
                        <li key={item.id}>{item.manga_title} (Serial No: {item.serial_no})</li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => handleAction(order.id, 'checkout')} className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded shadow-sm text-sm">
                    ลูกค้ารับหนังสือแล้ว
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">รายการที่กำลังถูกเช่า</h2>
          {checkedOutOrders.length === 0 ? <p className="text-gray-400 text-center py-4">ไม่มีรายการที่กำลังเช่า</p> : (
            <div className="space-y-6">
              {checkedOutOrders.map(order => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-800">ลูกค้า: {order.customer_name}</p>
                    <p className="text-xs text-gray-500">Order ID: {order.id}</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                        <tr>
                          <th className="px-4 py-2">ชื่อหนังสือ</th>
                          <th className="px-4 py-2">Serial No.</th>
                          <th className="px-4 py-2">จำนวนวันเช่า</th>
                          <th className="px-4 py-2">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{item.manga_title}</td>
                            <td className="px-4 py-3">{item.serial_no}</td>
                            <td className="px-4 py-3 font-semibold text-gray-600">{item.rent_days} วัน</td>
                            <td className="px-4 py-3">
                              <button className="text-blue-600 hover:text-blue-800 font-semibold underline">ดูรายละเอียด</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminOrders;