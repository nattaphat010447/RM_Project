import { authFetch } from '../api';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Log user behavior for model training
 * @param {number} mangaId - Manga ID
 * @param {'CLICK'|'ADD_CART'} eventType - Event type
 * @param {'BROWSE'|'SEARCH'|'RECOMMENDATION'|'PROFILE'|'DIRECT'} source - Source page
 * @param {object} metadata - Optional metadata (duration_sec, position, etc.)
 */
export const logBehavior = async (mangaId, eventType, source = 'DIRECT', metadata = {}) => {
  try {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return;
    }

    await authFetch(`${API_URL}/api/behaviors/log/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manga_id: mangaId,
        event_type: eventType,
        source: source,
        ...metadata
      })
    });
  } catch (err) {
    // Silent fail - don't block user experience
  }
};

/**
 * Log CLICK event (view manga detail)
 */
export const logClick = (mangaId, source = 'DIRECT') => {
  logBehavior(mangaId, 'CLICK', source);
};

/**
 * Log ADD_CART event
 */
export const logAddToCart = (mangaId, source = 'DIRECT') => {
  logBehavior(mangaId, 'ADD_CART', source);
};
