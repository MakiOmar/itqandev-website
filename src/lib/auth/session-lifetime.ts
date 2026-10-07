import type { Cookie, CookieOptions } from '@builder.io/qwik-city';
import { getConfig } from '../config';

const DAY_MS = 24 * 60 * 60 * 1000;

function rememberDays(): number {
  const days = Number(getConfig().auth.rememberDays);
  return Number.isFinite(days) && days > 0 ? Math.min(365, Math.floor(days)) : 30;
}

/** `expiresAt` for a new or refreshed session: a sliding day, or `rememberDays` when remembered. */
export function sessionExpiresAt(remember: boolean | undefined): number {
  return Date.now() + (remember ? rememberDays() * DAY_MS : DAY_MS);
}

/**
 * HttpOnly `auth_session` cookie options. Without "Remember me" there is no `maxAge`, so the
 * browser drops the cookie when it closes.
 */
export function authSessionCookieOptions(remember: boolean | undefined): CookieOptions {
  const domain = authSessionCookieDomain();
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    ...(domain ? { domain } : {}),
    ...(remember ? { maxAge: [rememberDays(), 'days'] as [number, 'days'] } : {}),
  };
}

/** `VITE_AUTH_COOKIE_DOMAIN`, or empty for a host-only cookie. */
export function authSessionCookieDomain(): string {
  return (getConfig().auth.cookieDomain ?? '').trim();
}

/** Options for `cookie.delete()` that match the cookie written by `authSessionCookieOptions`. */
export function authSessionCookieDeleteOptions(): { path: string; domain?: string } {
  const domain = authSessionCookieDomain();
  return domain ? { path: '/', domain } : { path: '/' };
}

/**
 * With a cookie domain set, expire any older host-only `auth_session` (from before the domain was set).
 * It is sent ahead of the domain cookie and would shadow it with a revoked token. Qwik emits one
 * Set-Cookie per name per response, so call this only where the domain cookie is not also written.
 */
export function expireHostOnlyAuthSessionCookie(cookie: Cookie): void {
  const name = getConfig().auth.cookieName;
  if (authSessionCookieDomain() && cookie.has(name)) {
    cookie.delete(name, { path: '/' });
  }
}
