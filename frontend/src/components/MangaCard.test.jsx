import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MangaCard from './MangaCard';

describe('MangaCard', () => {
  const mockManga = {
    id: 1,
    title: 'Test Manga',
    author: 'Test Author',
    genre: 'Action/Adventure',
    cover_image: '/test.jpg',
    rental_fee: '50.00',
    avg_rating: '4.50'
  };

  it('renders manga title', () => {
    render(
      <BrowserRouter>
        <MangaCard manga={mockManga} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Manga')).toBeInTheDocument();
  });

  it('renders manga author', () => {
    render(
      <BrowserRouter>
        <MangaCard manga={mockManga} />
      </BrowserRouter>
    );
    expect(screen.getByText(/Test Author/i)).toBeInTheDocument();
  });

  it('renders rental fee', () => {
    render(
      <BrowserRouter>
        <MangaCard manga={mockManga} />
      </BrowserRouter>
    );
    expect(screen.getByText(/50.00/)).toBeInTheDocument();
  });
});
