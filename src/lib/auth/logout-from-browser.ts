import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { getConfig } from '../config';
import { getLocalizedRoutes } from '../constants/routes';

/**
 * Best-effort API logout, then a full navigation to the logout route so its loader clears the
 * HttpOnly cookies server-side (see QWIK_AUTH_LOGIN_LOGOUT.md).
 */
export async function logoutFromBrowser(lang: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getConfig().auth.cookieName);
  try {
    await getApiClient().post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch {
    // Logout must always complete client-side; the logout route clears cookies regardless.
  }
  window.location.href = getLocalizedRoutes(lang).ADMIN.LOGOUT;
}
