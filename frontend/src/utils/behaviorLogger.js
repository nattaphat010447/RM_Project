import { authFetch } from '../api';

const API_URL = import.meta.env.VITE_API_BASE_URL;

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

    // Skip if user not logged in
    if (!token) {
      console.log('⚠️ [BehaviorLog] Skipped: User not logged in');
      return;
    }

    console.log(`📊 [BehaviorLog] Logging ${eventType} event for manga #${mangaId} from ${source}`);

    const response = await authFetch(`${API_URL}/api/behaviors/log/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manga_id: mangaId,
        event_type: eventType,
        source: source,
        ...metadata
      })
    });

    if (response.ok) {
      console.log(`✅ [BehaviorLog] Successfully logged ${eventType} for manga #${mangaId}`);
    } else {
      const error = await response.json();
      console.warn(`⚠️ [BehaviorLog] Failed to log ${eventType}:`, error);
    }
  } catch (err) {
    // Non-blocking: don't show errors to user
    console.error('❌ [BehaviorLog] Error:', err.message);
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
