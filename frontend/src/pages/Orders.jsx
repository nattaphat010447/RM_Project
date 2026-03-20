import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin');
      return;
    }

    fetch(`${API_URL}/api/orders/`, {
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
  }, [navigate, API_URL]);

  const handleCancel = async (orderId) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอเช่านี้?")) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert("ยกเลิกคำขอสำเร็จ หนังสือถูกส่งคืนสู่ระบบแล้ว");
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: 'CANCELLED' } : order
        ));
      } else {
        const data = await response.json();
        alert(data.error || "เกิดข้อผิดพลาดในการยกเลิก");
      }
    } catch (err) {
      console.error(err);
      alert("ระบบขัดข้อง");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#2d116c] flex justify-center items-center text-white text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#2d116c] pt-16 px-4 pb-12">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-8 md:p-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">รายการคำขอเช่า</h2>
        
        <div className="mb-6">
          <Link to="/" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-6 rounded-md shadow-sm transition duration-200">
            กลับหน้าหลัก
          </Link>
        </div>

        {orders.length === 0 ? (
           <div className="text-center text-gray-500 font-bold text-xl py-10">คุณยังไม่มีประวัติการทำรายการ</div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col shadow-sm">
                
                <div className="bg-[#2d3748] text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                  <span className="font-semibold tracking-wide">Order ID: {order.id}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">สถานะ:</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs tracking-wider ${
                      order.status === 'REQUESTED' ? 'bg-yellow-400 text-gray-900' : 
                      order.status === 'CANCELLED' ? 'bg-red-500 text-white' : 
                      order.status === 'REJECTED' ? 'bg-orange-500 text-white' : 
                      order.status === 'CHECKED_OUT' ? 'bg-blue-400 text-white' :
                      'bg-green-400 text-green-900'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-x border-b border-gray-200 p-6 rounded-b-lg space-y-4">
                  <div className="space-y-2 text-gray-700">
                    <p><span className="font-bold mr-2">วันที่ขอ:</span> {order.requested_at_formatted || order.requested_at}</p>
                    <p><span className="font-bold mr-2">ราคารวม:</span> {order.total_rent_fee} บาท</p>
                  </div>

                  <div className="pt-2">
                    <p className="font-bold text-gray-800 mb-2">รายการมังงะ:</p>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex flex-col">
                          <div className="bg-[#edf2f7] text-gray-800 font-bold px-4 py-3 rounded-t-md">
                            {item.manga_title}
                          </div>
                          <div className="flex justify-between items-center border-x border-b border-gray-200 px-4 py-4 rounded-b-md">
                            <span className="font-semibold text-gray-700">Copy: {item.serial_no}</span>
                            <div className="flex flex-col items-end space-y-1">
                              <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {item.rent_days} วัน
                              </span>
                              <span className="text-gray-500 text-sm">
                                {item.rent_price_per_day} บาท/วัน
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.status === 'REQUESTED' && (
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => handleCancel(order.id)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-md shadow-sm transition duration-200"
                      >
                        ยกเลิกคำขอ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;