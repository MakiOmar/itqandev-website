import { stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';

function parseOriginFromEnvValue(raw: string): string {
  const env = raw.trim();
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
 * Absolute public site origin for SEO (canonical, OG, sitemap).
 * When API and site are on different hosts, set `VITE_PUBLIC_SITE_URL` (e.g. https://itq.example.com).
 * Falls back to `VITE_API_PROXY_TARGET` when site and API share one origin (local dev).
 */
export function parsePublicSiteOriginFromEnv(): string {
  const siteUrl = String(import.meta.env?.VITE_PUBLIC_SITE_URL ?? '').trim();
  if (siteUrl) {
    const origin = parseOriginFromEnvValue(siteUrl);
    if (origin) {
      return origin;
    }
  }
  return parseOriginFromEnvValue(String(import.meta.env?.VITE_API_PROXY_TARGET ?? ''));
}

/**
 * Public site origin for SEO (canonical, OG, sitemap).
 * Prefers `VITE_PUBLIC_SITE_URL`, then `VITE_API_PROXY_TARGET`; falls back to the request/page origin.
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
