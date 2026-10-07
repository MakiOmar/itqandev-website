import type { Cookie } from '@builder.io/qwik-city';
import type { AuthSession } from '../auth/types';
import { auth } from '../auth';
import { getConfig } from '../config';
import { routesFromPreferredCookie } from '../constants/routes';
import { stripUiLocaleFromPathname } from '../i18n/ui-locale-path';

type AdminAuthRedirect = (status: 301 | 302 | 303 | 307 | 308, url: string) => unknown;

/**
 * Admin dashboard auth — plain loader logic (routeLoader$ lives in admin layout only).
 */
export async function loadAdminAuthSession(
  cookie: Cookie,
  url: URL,
  redirectFn: AdminAuthRedirect,
): Promise<AuthSession | null> {
  const config = getConfig();
  const pathname = url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const logicalPath = stripUiLocaleFromPathname(normalizedPath);
  const R = routesFromPreferredCookie(cookie);
  const isLoginPage =
    logicalPath === config.routes.admin.login ||
    logicalPath === '/admin/login' ||
    normalizedPath.endsWith('/admin/login');

  let session: AuthSession | null = null;
  try {
    session = await auth.getSession(cookie);
  } catch {
    session = null;
  }

  if (!isLoginPage && !session) {
    throw redirectFn(302, R.ADMIN.LOGIN);
  }
  return session;
}

/**
 * Signed-in visitors on the login page go straight to the dashboard. Runs as the login route's
 * request handler: a second redirect thrown from a parallel loader turns the HTML response into a 404.
 */
export async function redirectSignedInFromLogin(
  cookie: Cookie,
  redirectFn: AdminAuthRedirect,
): Promise<void> {
  let session: AuthSession | null = null;
  try {
    session = await auth.getSession(cookie);
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.warn('Auth check on login page failed, allowing access:', error);
    }
  }
  if (session) {
    throw redirectFn(302, routesFromPreferredCookie(cookie).ADMIN.HOME);
  }
}
