import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

const AdminMangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [manga, setManga] = useState(null);
  
  // State สำหรับฟอร์มเช่าหน้าร้าน
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState('');
  const [rentDays, setRentDays] = useState(7);

  useEffect(() => {
    if (id === 'new') return;

    fetch(`${API_URL}/api/mangas/${id}/`)
      .then(res => res.json())
      .then(data => {
        setManga(data);
        const availableCopies = data.copies?.filter(c => c.status === 'AVAILABLE') || [];
        if (availableCopies.length > 0) setSelectedCopy(availableCopies[0].id);
      })
      .catch(err => console.error(err));
}, [id, API_URL]);

  // ฟังก์ชันค้นหาลูกค้า
  const handleSearchUser = async () => {
    if (searchUserQuery.length < 2) {
      alert("กรุณาพิมพ์อย่างน้อย 2 ตัวอักษร"); return;
    }
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/customers/search/?q=${searchUserQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUserResults(data);
      if(data.length === 0) alert("ไม่พบข้อมูลลูกค้า");
    } catch (err) { console.error(err); }
  };

  // ฟังก์ชันยืนยันการเช่า
  const handleCheckout = async () => {
    if (!selectedUser) { alert("กรุณาเลือกลูกค้าก่อน"); return; }
    if (!selectedCopy) { alert("กรุณาเลือกสำเนาหนังสือที่ว่าง"); return; }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/manual-checkout/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          copy_id: selectedCopy,
          rent_days: rentDays
        })
      });

      if (response.ok) {
        alert("ทำรายการเช่าหน้าร้านสำเร็จ!");
        navigate('/admin/orders'); // เด้งไปหน้าบิล
      } else {
        alert("เกิดข้อผิดพลาด");
      }
    } catch (err) { alert("ระบบขัดข้อง"); }
  };

  if (!manga) return <div className="min-h-screen bg-gray-200 flex justify-center items-center">Loading...</div>;

  const availableCopies = manga.copies?.filter(c => c.status === 'AVAILABLE') || [];

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex justify-center">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-8 relative h-fit">
        
        <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-8">
          <div className="flex gap-8">
            <button onClick={() => navigate('/admin/mangas')} className="text-black hover:text-gray-600 mt-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <img 
              src={manga.cover_image_url?.startsWith('http') || manga.cover_image_url?.startsWith('/') ? manga.cover_image_url : `${API_URL}${manga.cover_image_url}`} 
              alt={manga.title} 
              className="w-48 h-auto object-cover rounded-lg shadow-md border border-gray-200"
            />
            <div className="pt-2">
              <h2 className="text-xl text-gray-500 mb-1">รายละเอียดหนังสือ (Admin)</h2>
              <h1 className="text-3xl font-normal text-gray-800 mb-4">{manga.title}</h1>
              <p className="text-sm text-gray-600 mb-2">ผู้แต่ง: {manga.author}</p>
              <p className="text-sm text-gray-600 mb-4">หมวดหมู่: {manga.genre}</p>
              <p className="text-sm font-bold text-gray-800">ราคาเช่า: {manga.rental_price_per_day} บาท/วัน</p>
            </div>
          </div>
          <Link to={`/admin/mangas/edit/${manga.id}`} className="text-blue-500 border border-blue-200 rounded-full px-6 py-2 hover:bg-blue-50 transition text-sm">
            แก้ไขข้อมูลหนังสือ
          </Link>
        </div>

        {/* ส่วนของการเช่าหน้าร้าน */}
        <div>
          <h2 className="text-2xl font-normal text-gray-800 mb-2">เช่าหนังสือให้ลูกค้า</h2>
          <p className="text-sm text-gray-500 mb-4">ค้นหาลูกค้า (ชื่อ, อีเมล)</p>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="พิมพ์เพื่อค้นหา..." 
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 text-gray-700"
            />
            <button onClick={handleSearchUser} className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50">ค้นหา</button>
          </div>

          {/* แสดงผลลัพธ์ลูกค้า */}
          {userResults.length > 0 && !selectedUser && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">เลือกลูกค้า:</p>
              {userResults.map(user => (
                <div key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-indigo-50 p-2 rounded border-b border-gray-100 flex justify-between">
                  <span className="font-bold text-gray-700">{user.full_name}</span>
                  <span className="text-gray-500 text-sm">{user.email} | {user.phone}</span>
                </div>
              ))}
            </div>
          )}

          {/* เมื่อเลือกลูกค้าแล้ว แสดงฟอร์มเช่า */}
          {selectedUser && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 animate-fade-in mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-indigo-900">กำลังทำรายการให้: {selectedUser.full_name}</p>
                <button onClick={() => setSelectedUser(null)} className="text-sm text-red-500 underline">เปลี่ยนลูกค้า</button>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">เลือกสำเนา (Copy)</label>
                  <select 
                    value={selectedCopy} 
                    onChange={(e) => setSelectedCopy(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {availableCopies.length === 0 ? <option value="">ไม่มีเล่มว่าง</option> : 
                      availableCopies.map(c => <option key={c.id} value={c.id}>{c.serial_no}</option>)
                    }
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนวัน</label>
                  <input 
                    type="number" min="1" value={rentDays} onChange={(e) => setRentDays(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={availableCopies.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md disabled:bg-gray-400"
              >
                ยืนยันการเช่าหน้าร้าน
              </button>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.animate-fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}} />
    </div>
  );
};

export default AdminMangaDetail;