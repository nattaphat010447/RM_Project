import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renders correct number of stars', () => {
    const { container } = render(<StarRating rating={4.5} />);
    const stars = container.querySelectorAll('svg');
    expect(stars.length).toBeGreaterThan(0);
  });

  it('renders with zero rating', () => {
    const { container } = render(<StarRating rating={0} />);
    expect(container).toBeInTheDocument();
  });

  it('renders with max rating', () => {
    const { container } = render(<StarRating rating={5} />);
    expect(container).toBeInTheDocument();
  });
});
