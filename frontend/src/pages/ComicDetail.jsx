import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ComicDetail = () => {
  const navigate = useNavigate();
  
  const [isAdded, setIsAdded] = useState(false);
  const [copyId, setCopyId] = useState('OP-001-A');
  const [rentalDays, setRentalDays] = useState(7);

  const mockComic = {
    id: 1,
    title: 'One Piece Volume 1',
    author: 'Eiichiro Oda',
    category: 'Action/Adventure',
    pricePerDay: '15.00',
    imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png'
  };

  const handleAddToCart = () => {
    setIsAdded(true);
    
    console.log(`[Log] Trigger API: POST /log/cart -> Comic ID: ${mockComic.id}, Copy: ${copyId}, Days: ${rentalDays}`);
    
    setTimeout(() => setIsAdded(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#2d116c] pt-10 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        
        {isAdded && (
          <div className="bg-[#d1e7dd] text-[#0f5132] px-6 py-4 rounded-md mb-6 font-bold shadow-md transition-all">
            Added copy {copyId} to the cart successfully.
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 md:p-10 relative shadow-2xl flex flex-col md:flex-row gap-10">
          
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 w-10 h-10 bg-gray-50 hover:bg-gray-200 border border-gray-200 rounded-full flex items-center justify-center transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="w-full md:w-2/5 mt-14 md:mt-0 flex justify-center">
            <img 
              src={mockComic.imgUrl} 
              alt={mockComic.title} 
              className="w-full max-w-sm h-auto object-cover rounded-xl shadow-md border border-gray-100"
            />
          </div>

          <div className="w-full md:w-3/5 flex flex-col pt-2 md:pt-4">
            <h1 className="text-3xl font-bold text-purple-900 mb-4">{mockComic.title}</h1>
            
            <div className="space-y-2 text-gray-700 mb-6">
              <p><span className="font-semibold text-gray-500 w-24 inline-block">Author:</span> {mockComic.author}</p>
              <p><span className="font-semibold text-gray-500 w-24 inline-block">Category:</span> {mockComic.category}</p>
              <p className="pt-2">
                <span className="font-semibold text-gray-800">Rental Price:</span> 
                <span className="font-bold text-lg text-gray-900 ml-2">{mockComic.pricePerDay} THB/day</span>
              </p>
            </div>

            <div className="space-y-5 mb-8 flex-grow">
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Select copy to rent</label>
                <div className="relative">
                  <select 
                    value={copyId}
                    onChange={(e) => setCopyId(e.target.value)}
                    className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                  >
                    <option value="OP-001-A">Copy ID: OP-001-A</option>
                    <option value="OP-001-B">Copy ID: OP-001-B</option>
                    <option value="OP-001-C">Copy ID: OP-001-C</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Number of rental days</label>
                <input 
                  type="number" 
                  min="1"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                />
              </div>

            </div>

            <button 
              onClick={handleAddToCart}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg py-4 rounded-xl transition duration-200 shadow-md"
            >
              Add to Cart
            </button>
            
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ComicDetail;