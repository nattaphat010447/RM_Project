import React from 'react';
import { Link } from 'react-router-dom';

const Orders = () => {
  const mockOrders = [
    {
      orderId: '8',
      status: 'REQUESTED',
      requestedDate: '12-03-2026 03:27',
      totalPrice: '105.00',
      items: [
        {
          title: 'One Piece Volume 1',
          copyId: 'OP-001-A',
          duration: '7 Days',
          pricePerDay: '15.00'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#2d116c] pt-16 px-4 pb-12">
      
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-8 md:p-12">
        
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          My Rental Orders
        </h2>

        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-6 rounded-md shadow-sm transition duration-200"
          >
            Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          {mockOrders.map((order, index) => (
            <div key={index} className="flex flex-col">
              
              <div className="bg-[#2d3748] text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                <span className="font-semibold tracking-wide">Order ID: {order.orderId}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Status:</span>
                  <span className="bg-yellow-400 text-gray-900 font-bold px-3 py-1 rounded-full text-xs tracking-wider">
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="border-x border-b border-gray-200 p-6 rounded-b-lg space-y-4">
                
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-bold">Requested Date:</span> {order.requestedDate}</p>
                  <p><span className="font-bold">Total Price:</span> {order.totalPrice} THB</p>
                </div>

                <div className="pt-2">
                  <p className="font-bold text-gray-800 mb-2">Manga List:</p>
                  
                  <div className="space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="bg-[#edf2f7] text-gray-800 font-bold px-4 py-3 rounded-t-md">
                          {item.title}
                        </div>
                        <div className="flex justify-between items-center border-x border-b border-gray-200 px-4 py-4 rounded-b-md">
                          <span className="font-semibold text-gray-700">Copy: {item.copyId}</span>
                          <div className="flex flex-col items-end space-y-1">
                            <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                              {item.duration}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {item.pricePerDay} THB/day
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-md shadow-sm transition duration-200">
                    Cancel Request
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Orders;