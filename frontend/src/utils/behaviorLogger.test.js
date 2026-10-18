import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authFetch } from '../api';
import { logClick, logAddToCart } from './behaviorLogger';

vi.mock('../api', () => ({
  authFetch: vi.fn(() => Promise.resolve({ ok: true })),
}));

const lastBody = () => JSON.parse(authFetch.mock.calls.at(-1)[1].body);

describe('behaviorLogger', () => {
  beforeEach(() => {
    localStorage.clear();
    authFetch.mockClear();
  });

  it('skips logging when the user is not signed in', async () => {
    await logClick(1, 'BROWSE');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('posts a CLICK event with its source', async () => {
    localStorage.setItem('access_token', 'test-token');
    await logClick(123, 'RECOMMENDATION');
    expect(authFetch.mock.calls[0][0]).toMatch(/\/api\/behaviors\/log\/$/);
    expect(lastBody()).toEqual({ manga_id: 123, event_type: 'CLICK', source: 'RECOMMENDATION' });
  });

  it('posts an ADD_CART event', async () => {
    localStorage.setItem('access_token', 'test-token');
    await logAddToCart(456, 'SEARCH');
    expect(lastBody()).toEqual({ manga_id: 456, event_type: 'ADD_CART', source: 'SEARCH' });
  });

  it('never throws when the request fails', async () => {
    localStorage.setItem('access_token', 'test-token');
    authFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(logClick(1)).resolves.toBeUndefined();
  });
});
