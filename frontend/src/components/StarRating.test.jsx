import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from './StarRating';

const fills = (container) =>
  [...container.querySelectorAll('span[style]')].map((el) => el.style.width);

describe('StarRating (read-only)', () => {
  it('fills stars proportionally to the average', () => {
    const { container } = render(<StarRating rating={3.5} />);
    expect(fills(container)).toEqual(['100%', '100%', '100%', '50%', '0%']);
  });

  it('shows the average and the number of ratings', () => {
    render(<StarRating rating={4.25} count={12} />);
    expect(screen.getByText('4.3 (12)')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Rated 4.3 out of 5 from 12 ratings');
  });

  it('says when there are no ratings yet', () => {
    const { container } = render(<StarRating rating={0} count={0} />);
    expect(screen.getByText('No ratings')).toBeInTheDocument();
    expect(fills(container)).toEqual(['0%', '0%', '0%', '0%', '0%']);
  });

  it('clamps out-of-range values', () => {
    const { container } = render(<StarRating rating={9} />);
    expect(fills(container)).toEqual(['100%', '100%', '100%', '100%', '100%']);
  });
});

describe('StarRating (interactive)', () => {
  it('calls onRate with the chosen star', () => {
    const onRate = vi.fn();
    render(<StarRating mangaId={7} onRate={onRate} />);
    fireEvent.click(screen.getByLabelText('Rate 4 stars'));
    expect(onRate).toHaveBeenCalledWith(7, 4);
  });
});
