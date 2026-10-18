import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/image';
import StarRating from './StarRating';
import StatusBadge from './StatusBadge';

const hasAvailableCopy = (manga) =>
  Array.isArray(manga.copies) && manga.copies.some((copy) => copy.status === 'AVAILABLE');

const MangaCard = ({ manga }) => {
  const available = hasAvailableCopy(manga);

  return (
    <div className="group bg-lumina-surface-card rounded-2xl shadow-lumina-sm hover:shadow-lumina-lg transition-shadow duration-300 overflow-hidden flex flex-col">
      <Link to={`/manga/${manga.id}`} className="relative block aspect-[2/3] overflow-hidden">
        <img
          src={getImageUrl(manga.cover_image_url)}
          alt={manga.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute top-2 right-2">
          <StatusBadge status={available ? 'AVAILABLE' : 'UNAVAILABLE'} />
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow gap-2">
        <h3 className="font-jakarta font-semibold text-base text-lumina-text line-clamp-1 group-hover:text-lumina-primary transition-colors">
          {manga.title}
        </h3>
        {manga.author && (
          <p className="font-inter text-xs text-lumina-text-muted line-clamp-1">{manga.author}</p>
        )}
        {manga.genre && (
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wide text-lumina-text-muted bg-lumina-surface-alt px-2 py-0.5 rounded-full w-fit max-w-full truncate">
            {manga.genre}
          </span>
        )}

        <div className="mt-auto pt-3 border-t border-lumina-outline/40 flex items-center justify-between gap-2">
          <StarRating rating={manga.avg_rating} />
          <span className="font-inter text-[11px] font-medium text-lumina-text-muted whitespace-nowrap">
            Sold {manga.sold_count || 0}
          </span>
        </div>

        <Link
          to={`/manga/${manga.id}`}
          className="w-full bg-lumina-primary hover:bg-lumina-primary-light text-white font-inter font-semibold text-sm py-2 rounded-lg text-center transition-colors duration-200"
        >
          Rent
        </Link>
      </div>
    </div>
  );
};

export default MangaCard;
