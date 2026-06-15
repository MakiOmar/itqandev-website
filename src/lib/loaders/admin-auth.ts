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

  try {
    const session = await auth.getSession(cookie);

    if (isLoginPage && session) {
      throw redirectFn(302, R.ADMIN.HOME);
    }

    if (!isLoginPage && !session) {
      throw redirectFn(302, R.ADMIN.LOGIN);
    }

    return session;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
    if (!isLoginPage) {
      throw redirectFn(302, R.ADMIN.LOGIN);
    }
    return null;
  }
}
