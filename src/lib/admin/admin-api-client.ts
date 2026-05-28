import type { Cookie } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { speakConfig } from '../i18n/config';
import { uiLocaleFromPublicRoute } from '../i18n/ui-locale-path';

export function presentationLocaleFromAdminRoute(
  cookie: Cookie,
  request: { headers: Headers; url: string },
  paramsLang?: string,
): string {
  const cookieHeader = extractCookieHeader(cookie, request);
  return (
    uiLocaleFromPublicRoute(cookieHeader, paramsLang, request.url) ??
    speakConfig.defaultLocale.lang
  );
}

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
