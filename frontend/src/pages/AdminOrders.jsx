import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [returningItems, setReturningItems] = useState([]); 
  
  const [fineModal, setFineModal] = useState({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' });
  const [fineData, setFineData] = useState({ fine_type: 'LATE', fine_amount: '' });

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
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleAction = async (orderId, action) => {
    const confirmMsg = action === 'approve' ? "ยืนยันการอนุมัติ?" : action === 'reject' ? "ยืนยันการปฏิเสธ?" : "ยืนยันว่าลูกค้ารับหนังสือแล้ว?";
    if (!window.confirm(confirmMsg)) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/${action}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchOrders();
      else alert("เกิดข้อผิดพลาด");
    } catch (err) { alert("ระบบขัดข้อง"); }
  };

  const handleCompleteReturn = async (orderId, itemId) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/items/${itemId}/return/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setReturningItems(returningItems.filter(id => id !== itemId));
        fetchOrders();
      } else {
        alert("เกิดข้อผิดพลาด");
      }
    } catch (err) { alert("ระบบขัดข้อง"); }
  };

  const handleSubmitFine = async (e) => {
    e.preventDefault();
    if (!fineData.fine_amount || fineData.fine_amount <= 0) {
      alert("กรุณาระบุจำนวนเงินค่าปรับ"); return;
    }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${fineModal.orderId}/items/${fineModal.itemId}/fine/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fine_type: fineData.fine_type,
          fine_amount: fineData.fine_amount
        })
      });

      if (response.ok) {
        alert("บันทึกค่าปรับและรับคืนสำเร็จ!");
        setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' });
        setFineData({ fine_type: 'LATE', fine_amount: '' });
        setReturningItems(returningItems.filter(id => id !== fineModal.itemId));
        fetchOrders();
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกค่าปรับ");
      }
    } catch (err) { alert("ระบบขัดข้อง"); }
  };

  if (loading) return <div className="min-h-screen bg-gray-200 flex items-center justify-center">Loading...</div>;

  const requestedOrders = orders.filter(o => o.status === 'REQUESTED');
  const approvedOrders = orders.filter(o => o.status === 'APPROVED');
  const checkedOutOrders = orders.filter(o => o.status === 'CHECKED_OUT');

  return (
    <div className="min-h-screen bg-gray-200 p-4 md:p-10 relative">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-8 relative">
        
        <button onClick={() => navigate('/admin/dashboard')} className="absolute top-8 left-8 text-gray-600 hover:text-black">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">รายการเช่าหนังสือ</h1>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">คำขอเช่าใหม่</h2>
          {requestedOrders.length === 0 ? <p className="text-gray-400">ไม่มีรายการใหม่</p> : (
            <div className="space-y-4">
              {requestedOrders.map(order => (
                <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-700">ลูกค้า: {order.customer_name}</p>
                    <p className="text-xs text-gray-500 mb-1">เวลา: {order.requested_at_formatted}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(order.id, 'approve')} className="bg-[#4CAF50] text-white py-2 px-4 rounded text-sm font-bold">อนุมัติ</button>
                    <button onClick={() => handleAction(order.id, 'reject')} className="bg-[#F44336] text-white py-2 px-4 rounded text-sm font-bold">ปฏิเสธ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">รอลูกค้ามารับหนังสือ</h2>
          {approvedOrders.length === 0 ? <p className="text-gray-400">ไม่มีรายการ</p> : (
            <div className="space-y-4">
              {approvedOrders.map(order => (
                <div key={order.id} className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex justify-between items-center">
                  <p className="text-sm font-bold text-indigo-900">ลูกค้า: {order.customer_name}</p>
                  <button onClick={() => handleAction(order.id, 'checkout')} className="bg-indigo-600 text-white py-2 px-4 rounded text-sm font-bold">ลูกค้ารับหนังสือแล้ว</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">รายการที่กำลังถูกเช่า</h2>
          {checkedOutOrders.length === 0 ? <p className="text-gray-400">ไม่มีรายการที่กำลังเช่า</p> : (
            <div className="space-y-6">
              {checkedOutOrders.map(order => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-800">ลูกค้า: {order.customer_name} <span className="text-xs text-gray-500 ml-2">(Order ID: {order.id})</span></p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                        <tr>
                          <th className="px-4 py-2">ชื่อหนังสือ</th>
                          <th className="px-4 py-2">Serial No.</th>
                          <th className="px-4 py-2 w-1/3 text-right">จัดการรับคืน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{item.manga_title}</td>
                            <td className="px-4 py-3">{item.serial_no}</td>
                            <td className="px-4 py-3 text-right">
                              
                              {item.item_status === 'CHECKED_OUT' ? (
                                !returningItems.includes(item.id) ? (
                                  <button 
                                    onClick={() => setReturningItems([...returningItems, item.id])}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-4 rounded shadow-sm text-xs transition"
                                  >
                                    ลูกค้าคืนหนังสือแล้ว
                                  </button>
                                ) : (
                                  <div className="flex justify-end items-center gap-2 animate-fade-in">
                                    <button 
                                      onClick={() => handleCompleteReturn(order.id, item.id)}
                                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded shadow-sm text-xs transition"
                                    >
                                      เสร็จสิ้น
                                    </button>
                                    <button 
                                      onClick={() => setFineModal({ isOpen: true, orderId: order.id, itemId: item.id, mangaTitle: item.manga_title })}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 rounded shadow-sm text-xs transition"
                                    >
                                      ค่าปรับ
                                    </button>
                                    <button 
                                      onClick={() => setReturningItems(returningItems.filter(id => id !== item.id))}
                                      className="text-gray-400 hover:text-gray-600 px-1 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className={`font-bold text-xs ${item.item_status === 'RETURNED' ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.item_status === 'RETURNED' ? 'คืนแล้ว' : item.item_status}
                                </span>
                              )}

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

      {fineModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-xl font-bold text-red-600 mb-2">แจ้งชำระค่าปรับ</h3>
            <p className="text-sm text-gray-600 mb-6">หนังสือ: <span className="font-bold">{fineModal.mangaTitle}</span></p>
            
            <form onSubmit={handleSubmitFine} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ประเภทค่าปรับ</label>
                <select 
                  value={fineData.fine_type} 
                  onChange={(e) => setFineData({...fineData, fine_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-red-500"
                >
                  <option value="LATE">คืนล่าช้า</option>
                  <option value="DAMAGE">หนังสือเสียหาย</option>
                  <option value="LOST">หนังสือสูญหาย</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนเงินค่าปรับ</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={fineData.fine_amount}
                  onChange={(e) => setFineData({...fineData, fine_amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-red-500"
                  placeholder="โปรดระบุจำนวนเงินค่าปรับ"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setFineModal({ isOpen: false, orderId: null, itemId: null, mangaTitle: '' })}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition shadow-md"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
};

export default AdminOrders;