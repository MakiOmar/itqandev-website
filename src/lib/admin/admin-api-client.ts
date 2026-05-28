import type { Cookie } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { presentationLocaleFromAdminRoute } from './taxonomy-list-options';

/** API client for admin routes: always sends `X-Content-Locale` from URL / cookie. */
export function adminApiClient(
  cookie: Cookie,
  request: { headers: Headers; url: string },
  paramsLang?: string,
) {
  const cookieHeader = extractCookieHeader(cookie, request);
  const presentationLocale = presentationLocaleFromAdminRoute(cookie, request, paramsLang);

  return getApiClient(cookieHeader, presentationLocale);
}
