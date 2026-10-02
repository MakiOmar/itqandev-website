import type { CookieOptions } from '@builder.io/qwik-city';
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
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    ...(remember ? { maxAge: [rememberDays(), 'days'] as [number, 'days'] } : {}),
  };
}
