import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchMembers = () => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/admin/users/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบสมาชิก "${name}"? (ข้อมูลจะถูกซ่อนจากระบบ)`)) return;
    
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("ลบสมาชิกสำเร็จ");
        setMembers(members.filter(m => m.id !== id));
      } else {
        alert("เกิดข้อผิดพลาดในการลบ");
      }
    } catch (err) { alert("ระบบขัดข้อง"); }
  };

  if (loading) return <div className="min-h-screen bg-gray-200 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-8 relative">
        <button onClick={() => navigate('/admin/dashboard')} className="absolute top-6 left-6 text-black hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <button onClick={() => navigate('/')} className="absolute top-6 right-6 text-black hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8 mt-4">การจัดการสมาชิก</h1>

        <div className="flex justify-end mb-4">
          <Link to="/admin/members/new" className="bg-[#4CAF50] hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md text-sm">
            + เพิ่มสมาชิกใหม่
          </Link>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-center text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-700">ID</th>
                <th className="px-4 py-3 font-bold text-gray-700">ชื่อ</th>
                <th className="px-4 py-3 font-bold text-gray-700">อีเมล</th>
                <th className="px-4 py-3 font-bold text-gray-700">เบอร์โทร</th>
                <th className="px-4 py-3 font-bold text-gray-700">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{member.id}</td>
                  <td className="px-4 py-3 text-gray-800">{member.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <Link to={`/admin/members/edit/${member.id}`} className="bg-[#FFC107] hover:bg-yellow-500 text-gray-900 font-bold py-1 px-3 rounded text-xs shadow-sm">
                      แก้ไข
                    </Link>
                    <button onClick={() => handleDelete(member.id, member.full_name)} className="bg-[#F44336] hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs shadow-sm">
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMembers;