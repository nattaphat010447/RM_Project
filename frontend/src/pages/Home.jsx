import React from 'react';
import { Link } from 'react-router-dom';

const mockRecommended = [
  { id: 1, title: 'Demon Slayer เล่ม 1', genre: 'Action', rating: 4, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
  { id: 2, title: 'Demon Slayer เล่ม 2', genre: 'Action', rating: 4, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
  { id: 3, title: 'Demon Slayer เล่ม 3', genre: 'Action', rating: 4, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
];

const mockPopular = [
  { id: 4, title: 'One Piece เล่ม 100', genre: 'Adventure', rating: 5, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
  { id: 5, title: 'Jujutsu Kaisen เล่ม 1', genre: 'Action', rating: 4, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
  { id: 6, title: 'Spy x Family เล่ม 1', genre: 'Comedy', rating: 5, imgUrl: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/6/68/Season_1_Poster_2.png' },
];

const ComicCard = ({ comic }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col hover:shadow-xl transition-shadow duration-300">
      <img src={comic.imgUrl} alt={comic.title} className="w-full h-64 object-cover rounded-xl mb-4" />
      
      <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{comic.title}</h3>
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          {comic.genre}
        </span>
        <div className="flex text-yellow-400 text-sm">
          {'★'.repeat(comic.rating)}{'☆'.repeat(5 - comic.rating)}
        </div>
      </div>
      
      <Link 
        to={`/comic/${comic.id}`}
        className="mt-auto w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-xl transition duration-200 shadow-sm block text-center"
      >
        Rent
      </Link>
    </div>
  );
};

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      <div className="relative bg-blue-900 w-full h-80 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.3) 10deg 20deg)' }}></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-lg mb-4 text-center transform -rotate-2">
            COMIC BOOK RENTAL STORE
          </h1>
          <div className="w-40 h-40 bg-yellow-300 rounded-full border-4 border-yellow-500 flex items-center justify-center overflow-hidden shadow-2xl">
             <span className="font-bold text-yellow-800">Zenitsu Image</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto -mt-8 relative z-20 px-4">
        <div className="bg-white rounded-full shadow-lg p-2 flex items-center">
          <input 
            type="text" 
            placeholder="ค้นหาหนังสือการ์ตูน..." 
            className="flex-grow px-6 py-3 bg-transparent focus:outline-none text-gray-700 font-medium"
          />
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        
        <section>
          <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-600 pl-4">Recommend for You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {mockRecommended.map(comic => (
              <ComicCard key={`rec-${comic.id}`} comic={comic} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button className="text-gray-500 hover:text-purple-600 font-bold flex items-center transition">
              More <span className="ml-1">→</span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-600 pl-4">Popular This Week</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {mockPopular.map(comic => (
              <ComicCard key={`pop-${comic.id}`} comic={comic} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button className="text-gray-500 hover:text-purple-600 font-bold flex items-center transition">
              More <span className="ml-1">→</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;