import { stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';

/** Absolute origin from `VITE_API_PROXY_TARGET` (path segment ignored), or empty when unset. */
export function parsePublicSiteOriginFromEnv(): string {
  const env = String(import.meta.env?.VITE_API_PROXY_TARGET ?? '').trim();
  if (!env) {
    return '';
  }
  try {
    const u = new URL(/^https?:\/\//i.test(env) ? env : `https://${env}`);
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * Public site origin for SEO (canonical, OG, sitemap).
 * Prefers `VITE_API_PROXY_TARGET` origin; falls back to the current page origin in the browser/SSR request.
 */
export function getPublicSiteOrigin(pageOrigin?: string): string {
  return parsePublicSiteOriginFromEnv() || String(pageOrigin ?? '').replace(/\/$/, '');
}

/** Base URL without trailing slash (paths are appended explicitly). */
export function getPublicSiteBaseUrl(pageOrigin?: string): string {
  const origin = getPublicSiteOrigin(pageOrigin);
  return origin || 'https://example.com';
}

/**
 * Absolute canonical URL for a pathname (locale prefix stripped; no query/hash).
 */
export function buildCanonicalHref(pathname: string, pageOrigin?: string): string {
  const base = getPublicSiteBaseUrl(pageOrigin).replace(/\/$/, '');
  const path = stripUiLocaleFromPathname(pathname || '/');
  const normalized = path === '/' || path === '' ? '/' : path.replace(/\/$/, '') || '/';
  return `${base}${normalized}`;
}

/** CMS or editor value → absolute canonical URL. */
export function resolveAbsoluteCanonicalUrl(raw: string, baseUrl: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = baseUrl.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
