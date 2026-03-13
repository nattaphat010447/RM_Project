import React from 'react';
import { Link } from 'react-router-dom';

const Cart = () => {
  return (
    <div className="min-h-screen bg-[#2d116c] pt-16 px-4 pb-12">
      
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl p-8 md:p-12">
        
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Shopping Cart
        </h2>

        <div className="flex justify-between items-center mb-8">
          <Link 
            to="/" 
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-6 rounded-md shadow-sm transition duration-200"
          >
            Back to Home
          </Link>
          <Link 
            to="/orders" 
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-6 rounded-md shadow-sm transition duration-200"
          >
            My Rentals
          </Link>
        </div>

        <div className="space-y-4">
          
          <div className="bg-[#d1e7dd] border border-[#badbcc] text-[#0f5132] px-4 py-5 rounded-md text-center font-bold shadow-sm">
            Rental order placed successfully!
          </div>

          <div className="bg-[#fff3cd] border border-[#ffecb5] text-[#664d03] px-4 py-5 rounded-md text-center font-bold shadow-sm">
            Your cart is empty.
          </div>

        </div>

      </div>
    </div>
  );
};

export default Cart;