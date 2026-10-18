import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MangaCard from './MangaCard';

const baseManga = {
  id: 1,
  title: 'Test Manga',
  author: 'Test Author',
  genre: 'Action, Sci-Fi',
  cover_image_url: '/images/mangas/test.jpg',
  rental_price_per_day: '18.50',
  avg_rating: 4.5,
  rating_count: 8,
  sold_count: 3,
  copies: [{ id: 1, serial_no: 'T-01', status: 'AVAILABLE' }],
};

const renderCard = (manga) =>
  render(
    <BrowserRouter>
      <MangaCard manga={manga} />
    </BrowserRouter>
  );

describe('MangaCard', () => {
  it('renders title, author and genre pills', () => {
    renderCard(baseManga);
    expect(screen.getByText('Test Manga')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('shows the average rating and rating count under the book', () => {
    renderCard(baseManga);
    expect(screen.getByText('4.5 (8)')).toBeInTheDocument();
    expect(screen.getByText('Sold 3')).toBeInTheDocument();
  });

  it('shows "No ratings" for an unrated book', () => {
    renderCard({ ...baseManga, avg_rating: 0, rating_count: 0 });
    expect(screen.getByText('No ratings')).toBeInTheDocument();
  });

  it('shows availability badge from copies', () => {
    renderCard({ ...baseManga, copies: [{ id: 1, serial_no: 'T-01', status: 'RENTED' }] });
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('links to the detail page', () => {
    renderCard(baseManga);
    expect(screen.getByRole('link', { name: 'Detail' })).toHaveAttribute('href', '/manga/1');
  });
});
