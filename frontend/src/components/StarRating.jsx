import React, { useState } from 'react';

const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

const SIZES = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' };

/** One star filled to `fraction` (0..1): a grey star with a clipped amber star on top. */
const Star = ({ fraction, sizeClass }) => (
  <span className={`relative inline-block ${sizeClass}`}>
    <svg className={`absolute inset-0 ${sizeClass} text-lumina-outline`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
    <span className="absolute inset-0 overflow-hidden" style={{ width: `${fraction * 100}%` }}>
      <svg className={`${sizeClass} text-amber-400`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
    </span>
  </span>
);

/**
 * Read-only: pass `rating` (average, 0-5) and optionally `count` to show "4.5 (12)".
 * Interactive: pass `onRate(mangaId, value)`.
 */
const StarRating = ({ rating = 0, count = null, showValue = false, initialRating = 0, mangaId = null, onRate = null, size = 'sm' }) => {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(initialRating || 0);

  const interactive = typeof onRate === 'function';
  const sizeClass = SIZES[size] || SIZES.sm;

  if (!interactive) {
    const value = Math.min(Math.max(Number(rating) || 0, 0), 5);
    const label = count === 0
      ? 'No ratings yet'
      : `Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} rating${count === 1 ? '' : 's'}` : ''}`;
    return (
      <div className="flex items-center gap-1" title={label} aria-label={label} role="img">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} fraction={Math.min(Math.max(value - (star - 1), 0), 1)} sizeClass={sizeClass} />
          ))}
        </div>
        {(showValue || count !== null) && (
          <span className="font-inter text-[11px] font-medium text-lumina-text-muted whitespace-nowrap">
            {count === 0 ? 'No ratings' : value.toFixed(1)}
            {count ? ` (${count})` : ''}
          </span>
        )}
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
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          onClick={() => handleRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-125"
        >
          <Star fraction={star <= (hover || selected) ? 1 : 0} sizeClass={size === 'lg' ? SIZES.lg : SIZES.md} />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
