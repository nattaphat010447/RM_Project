import React, { useState } from 'react';

const StarRating = ({ rating = 0, initialRating = 0, mangaId = null, onRate = null, size = 'sm' }) => {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(initialRating || 0);

  const interactive = typeof onRate === 'function';
  const starSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm';

  if (!interactive) {
    const num = Math.round(rating || 0);
    return (
      <div className={`flex ${starSize} text-lumina-primary-light`} title={`Rating: ${rating || 0}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= num ? '' : 'opacity-30'}>★</span>
        ))}
      </div>
    );
  }

  const handleRating = async (rateValue) => {
    setSelected(rateValue);
    await onRate(mangaId, rateValue);
  };

  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs font-semibold text-lumina-text mr-1">Rate:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-125"
        >
          <span className={`${size === 'lg' ? 'text-2xl' : 'text-xl'} ${star <= (hover || selected) ? 'text-status-pending' : 'text-lumina-outline'}`}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

export default StarRating;
