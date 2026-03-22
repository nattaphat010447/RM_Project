import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';

import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import MangaDetail from './pages/MangaDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Popular from './pages/Popular';
import ForYou from './pages/ForYou';
import Search from './pages/Search';
import MyProfile from './pages/MyProfile';

import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminMembers from './pages/AdminMembers';
import AdminMemberForm from './pages/AdminMemberForm';
import AdminMangas from './pages/AdminMangas';
import AdminMangaDetail from './pages/AdminMangaDetail';
import AdminMangaForm from './pages/AdminMangaForm';
import AdminLostHistory from './pages/AdminLostHistory';

function App() {
  return (
    <Router>
      <Navbar />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/popular" element={<Popular />} />
        <Route path="/foryou" element={<ForYou />} />
        <Route path="/search" element={<Search />} />
        
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/orders" 
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/members" 
          element={
            <AdminRoute>
              <AdminMembers />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/members/new" 
          element={
            <AdminRoute>
              <AdminMemberForm />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/members/edit/:id" 
          element={
            <AdminRoute>
              <AdminMemberForm />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/mangas" 
          element={
            <AdminRoute>
              <AdminMangas />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/mangas/new" 
          element={
            <AdminRoute>
              <AdminMangaForm />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/mangas/edit/:id" 
          element={
            <AdminRoute>
              <AdminMangaForm />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/mangas/:id" 
          element={
            <AdminRoute>
              <AdminMangaDetail />
            </AdminRoute>
          } 
        />
        <Route
          path="/admin/history"
          element={
            <AdminRoute>
              <AdminLostHistory />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <MyProfile />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;