import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { auth } from '../../../lib/auth';
import { getConfig } from '../../../lib/config';

/**
 * Logout page - handles server-side cookie clearing and redirects to login
 * This runs server-side and has access to the cookie object for clearing HttpOnly cookies
 * 
 * According to QWIK_AUTH_LOGIN_LOGOUT.md:
 * - Call POST /api/auth/logout (best effort, ignore errors)
 * - Clear state: token, user, isAuthenticated
 * - Clear the cookie (server-side for HttpOnly cookies)
 * - Redirect to login page
 */
export const useLogoutLoader = routeLoader$(async ({ cookie, redirect: redirectFn, request }) => {
  const config = getConfig();
  
  try {
    // Call auth.logout which will:
    // 1. Call the backend logout API endpoint (with cookie-based auth)
    // 2. Clear the HttpOnly cookie server-side (via cookie.delete())
    // Pass request object so adapter can extract cookie header for server-side API calls
    await auth.logout(cookie, request);
  } catch {
    // Ignore errors - logout should always succeed on client side
    // Even if API call fails, we'll clear cookies
    // This matches the documented behavior: "best effort, ignore errors"
  }
  
  // Always clear the cookie server-side, even if API call failed
  // This ensures HttpOnly cookies are properly deleted
  // This is critical because HttpOnly cookies cannot be deleted from client-side JavaScript
  if (cookie) {
    cookie.delete(config.auth.cookieName, { path: '/' });
  }
  
  // Redirect to login page
  // The redirect will happen immediately, ensuring cookies are cleared first
  throw redirectFn(302, config.routes.admin.login);
});

/**
 * Logout page component
 * This component should never render as the loader always redirects
 */
export default component$(() => {
  // This should never render as the loader redirects
  return null;
});
