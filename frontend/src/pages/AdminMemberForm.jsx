import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AdminMemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    password: ''
  });

  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const token = localStorage.getItem('access_token');
      fetch(`${API_URL}/api/admin/users/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setFormData({
            username: data.username || '',
            fullName: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            dob: data.dob || '',
            password: ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id, API_URL, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');

    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      username: formData.username,
      first_name: firstName,
      last_name: lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      dob: formData.dob
    };

    if (!isEditMode || (isEditMode && formData.password)) {
      payload.password = formData.password;
    }

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${API_URL}/api/admin/users/${id}/` : `${API_URL}/api/admin/users/`;

      const response = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(isEditMode ? "บันทึกการแก้ไขสำเร็จ" : "เพิ่มสมาชิกใหม่สำเร็จ");
        navigate('/admin/members');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || Object.values(errorData).flat().join('\n') || "เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูล";
        alert(`เกิดข้อผิดพลาด:\n${errorMessage}`);
      }
    } catch (err) { 
        alert("ระบบขัดข้อง: " + err.message); 
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-200 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-4">
          {isEditMode ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อผู้ใช้ *</label>
            <input 
              type="text" required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500 bg-gray-50"
              placeholder="โปรดใส่ชื่อผู้ใช้ที่ไม่ซ้ำกับสมาชิกคนอื่น"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อเต็ม *</label>
              <input 
                type="text" required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="โปรดใส่ชื่อและนามสกุล"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">วันเกิด *</label>
              <input 
                type="date" required
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">อีเมล *</label>
              <input 
                type="email" required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="โปรดใส่อีเมลของสมาชิก"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">เบอร์โทรศัพท์ *</label>
              <input 
                type="text" required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="โปรดใส่เบอร์โทรศัพท์"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ที่อยู่ *</label>
            <textarea 
              required
              rows="3"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="โปรดใส่ที่อยู่ของสมาชิก"
            ></textarea>
          </div>

          <div className="bg-[#FEF9E7] border border-[#FDEBD0] rounded-lg p-5 mt-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              รหัสผ่าน {isEditMode ? '(กรอกใหม่หากต้องการเปลี่ยน)' : '*'}
            </label>
            <input 
              type="password"
              required={!isEditMode}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={isEditMode ? "ทิ้งว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่านให้สมาชิก..."}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-between items-center mt-10 pt-6 border-t">
            <button type="button" onClick={() => navigate('/admin/members')} className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-6 rounded-lg transition">
              ← กลับ
            </button>
            <button type="submit" className="bg-[#2C3E50] hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg transition shadow-md">
              {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างสมาชิก'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AdminMemberForm;