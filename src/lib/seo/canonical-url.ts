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
 * Absolute, self-referential canonical URL for a served pathname (no query/hash).
 *
 * Keeps the UI locale prefix and enforces a single trailing slash so the canonical
 * matches the 200 URL Qwik City serves (qwikCity default `trailingSlash: true`).
 * Bare/unprefixed paths (e.g. `/`, `/services`) 302-redirect to the locale-prefixed
 * URL, so canonicals must NOT strip the locale or the trailing slash — otherwise they
 * point at a redirect (Lighthouse: "rel=canonical points to the root URL").
 */
export function buildCanonicalHref(pathname: string, pageOrigin?: string): string {
  const base = getPublicSiteBaseUrl(pageOrigin).replace(/\/$/, '');
  const raw = pathname || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  // Collapse accidental double slashes, then enforce one trailing slash to match the served URL.
  const collapsed = path.replace(/\/{2,}/g, '/');
  const normalized = collapsed === '/' ? '/' : `${collapsed.replace(/\/+$/, '')}/`;
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
