import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { authFetch } from '../api';
import { ToastProvider } from '../components/Toast';
import Orders from './Orders';

vi.mock('../api', () => ({ authFetch: vi.fn() }));

const ok = (body, status = 200) => Promise.resolve({ ok: true, status, json: () => Promise.resolve(body) });

const returnedOrder = (userRating = 0) => [{
  id: 42,
  status: 'RETURNED',
  total_rent_fee: '57.00',
  requested_at_formatted: '01/10/2026 10:00',
  items: [{
    id: 9, manga_id: 7, manga_title: 'Monster', serial_no: 'MON-01', rent_price_per_day: '19.00',
    rent_days: 3, item_status: 'RETURNED', due_at: null, user_rating: userRating,
  }],
}];

const renderOrders = () =>
  render(
    <ToastProvider>
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    </ToastProvider>
  );

describe('Orders rating flow', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'token');
    authFetch.mockReset();
  });

  it('rates a returned manga through POST /api/mangas/:id/review/', async () => {
    authFetch
      .mockReturnValueOnce(ok(returnedOrder()))
      .mockReturnValueOnce(ok({ rating: 4, created: true, avg_rating: 4.5, rating_count: 2 }, 201));
    renderOrders();

    fireEvent.click(await screen.findByRole('button', { name: 'Rate this manga' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Monster');
    fireEvent.click(screen.getByLabelText('4 stars'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Rating' }));

    await waitFor(() => expect(authFetch).toHaveBeenCalledTimes(2));
    const [url, options] = authFetch.mock.calls[1];
    expect(url).toMatch(/\/api\/mangas\/7\/review\/$/);
    expect(JSON.parse(options.body)).toEqual({ rating: 4 });
    expect(await screen.findByText(/New average: 4\.5 \(2 ratings\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change rating' })).toBeInTheDocument();
  });

  it('opens a pre-filled modal for an existing rating', async () => {
    authFetch.mockReturnValueOnce(ok(returnedOrder(3)));
    renderOrders();
    fireEvent.click(await screen.findByRole('button', { name: 'Change rating' }));
    expect(screen.getByText(/You rated this manga 3 stars/)).toBeInTheDocument();
    expect(screen.getByLabelText('3 stars')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Update Rating' })).toBeDisabled();
  });

  it('shows the server error message', async () => {
    authFetch
      .mockReturnValueOnce(ok(returnedOrder()))
      .mockReturnValueOnce(Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({ error: 'You can only rate manga you have returned' }) }));
    renderOrders();
    fireEvent.click(await screen.findByRole('button', { name: 'Rate this manga' }));
    fireEvent.click(screen.getByLabelText('5 stars'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Rating' }));
    expect(await screen.findByText('You can only rate manga you have returned')).toBeInTheDocument();
  });
});
