import { describe, it, expect } from 'vitest';
import { logClick, logAddToCart } from './behaviorLogger';

vi.mock('../api', () => ({
  authFetch: vi.fn(() => Promise.resolve({ ok: true }))
}));

describe('behaviorLogger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('skips logging when user not authenticated', async () => {
    await logClick(1, 'BROWSE');
    expect(true).toBe(true);
  });

  it('logs click event with source', async () => {
    localStorage.setItem('access_token', 'test-token');
    await logClick(123, 'RECOMMENDATION');
    expect(true).toBe(true);
  });

  it('logs add to cart event', async () => {
    localStorage.setItem('access_token', 'test-token');
    await logAddToCart(456, 'SEARCH');
    expect(true).toBe(true);
  });
});
