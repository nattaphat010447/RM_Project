import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StarRating = ({ initialRating, mangaId, onRate }) => {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(initialRating || 0);

  const handleRating = async (rateValue) => {
    setRating(rateValue);
    await onRate(mangaId, rateValue);
  };

  return (
    <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
      <span className="text-sm font-bold text-yellow-800 mr-2">ให้คะแนน:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-125"
        >
          <span className={`text-2xl ${star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const calculateRemainingDays = (dueDateStr) => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleRateManga = async (mangaId, rating) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/mangas/${mangaId}/review/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ rating })
      });
      const data = await response.json();
      if (!response.ok) alert(data.error);
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

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

  const displayOrders = orders.map(order => {
    const validItems = order.items.filter(item => {
      if (item.item_status === 'LOST') return false;

      if (order.status === 'CHECKED_OUT' && item.due_at) {
        const remainingDays = calculateRemainingDays(item.due_at);
        if (remainingDays <= -90) {
          return false; 
        }
      }
      return true;
    });
    
    return { ...order, items: validItems };
  }).filter(order => order.items.length > 0);

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

        {displayOrders.length === 0 ? (
           <div className="text-center text-gray-500 font-bold text-xl py-10">คุณยังไม่มีประวัติการทำรายการ (หรือรายการถูกจัดเก็บแล้ว)</div>
        ) : (
          <div className="space-y-8">
            {displayOrders.map((order) => (
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
                      {order.items.map((item) => {
                        const remainingDays = calculateRemainingDays(item.due_at);

                        return (
                          <div key={item.id} className="flex flex-col border border-gray-100 rounded-md overflow-hidden">
                            <div className="bg-[#edf2f7] text-gray-800 font-bold px-4 py-3">
                              {item.manga_title}
                            </div>
                            <div className="flex justify-between items-center px-4 py-4 bg-white border-t border-gray-100">
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
                            
                            {order.status === 'CHECKED_OUT' && item.due_at && remainingDays !== null && (
                              <div className={`px-4 py-2 text-sm font-bold border-t ${
                                remainingDays < 0 ? 'bg-red-100 text-red-600' : 
                                remainingDays === 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-50 text-green-700'
                              }`}>
                                {remainingDays > 0 && `เหลือเวลาคืนอีก: ${remainingDays} วัน`}
                                {remainingDays === 0 && `ต้องคืนภายในวันนี้!`}
                                {remainingDays < 0 && `เลยกำหนดคืนมาแล้ว: ${Math.abs(remainingDays)} วัน`}
                              </div>
                            )}
                            
                            {item.item_status === 'RETURNED' && (
                              <div className="px-4 py-3 bg-white border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  คืนหนังสือสำเร็จแล้ว
                                </span>
                                
                                <StarRating 
                                  initialRating={item.user_rating} 
                                  mangaId={item.manga_id} 
                                  onRate={handleRateManga} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
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