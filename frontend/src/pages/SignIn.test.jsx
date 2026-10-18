import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignIn from './SignIn';

const renderSignIn = () =>
  render(
    <BrowserRouter>
      <SignIn />
    </BrowserRouter>
  );

const jsonResponse = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

describe('SignIn', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders required username and password fields', () => {
    renderSignIn();
    expect(screen.getByPlaceholderText(/username/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/password/i)).toBeRequired();
  });

  it('stores tokens and role after a successful login', async () => {
    global.fetch = vi.fn()
      .mockReturnValueOnce(jsonResponse({ access: 'acc', refresh: 'ref' }))
      .mockReturnValueOnce(jsonResponse({ role: 'CUSTOMER' }))
      .mockReturnValueOnce(jsonResponse({ has_preferences: true }));
    renderSignIn();
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'reader' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(localStorage.getItem('user_role')).toBe('CUSTOMER'));
    expect(localStorage.getItem('access_token')).toBe('acc');
    expect(localStorage.getItem('refresh_token')).toBe('ref');
  });

  it('alerts on invalid credentials', async () => {
    global.fetch = vi.fn().mockReturnValueOnce(jsonResponse({ detail: 'No active account' }, false));
    renderSignIn();
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'reader' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid credentials'));
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
