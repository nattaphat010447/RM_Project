import React, { useState } from 'react';

const RatingModal = ({ isOpen, onClose, manga, onSubmit, currentRating = null }) => {
  const [rating, setRating] = useState(currentRating || 5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isAlreadyRated = currentRating !== null && currentRating !== undefined;

  const handleSubmit = async () => {
    if (!manga || !manga.id) {
      onClose();
      return;
    }
    setSubmitting(true);
    await onSubmit(rating);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <h3 className="text-2xl font-bold text-lumina-text mb-2 font-jakarta">
          {isAlreadyRated ? 'Your Rating' : 'Rate This Manga'}
        </h3>
        <p className="text-lumina-text-muted mb-6 font-inter">{manga?.title}</p>

        {isAlreadyRated && (
          <div className="bg-lumina-primary/10 border border-lumina-primary/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-lumina-primary font-inter text-center">
              ✓ You have already rated this manga
            </p>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => !isAlreadyRated && setRating(star)}
              onMouseEnter={() => !isAlreadyRated && setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={isAlreadyRated}
              className={`focus:outline-none transition-transform ${
                isAlreadyRated ? 'cursor-not-allowed opacity-80' : 'hover:scale-110 cursor-pointer'
              }`}
            >
              <svg
                className={`w-12 h-12 ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        <p className="text-center text-lumina-text-muted mb-6 font-inter">
          {rating === 1 && "Poor"}
          {rating === 2 && "Fair"}
          {rating === 3 && "Good"}
          {rating === 4 && "Very Good"}
          {rating === 5 && "Excellent"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border-2 border-lumina-outline rounded-xl font-inter font-semibold text-lumina-text hover:bg-gray-50 transition-colors"
          >
            {isAlreadyRated ? 'Close' : 'Cancel'}
          </button>
          {!isAlreadyRated && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 px-4 bg-lumina-primary text-white rounded-xl font-inter font-semibold hover:bg-lumina-primary-light transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
