/**
 * The CDN in front of the API keys its cache on the URL and ignores `Vary: X-Content-Locale`,
 * so localized requests also carry `?locale=`; the backend only lets shared caches store a
 * localized response when the two match (`SetHttpCacheHeaders`).
 */
export function withLocaleQuery(url: string, locale: string | null | undefined): string {
  const code = String(locale ?? '').trim().toLowerCase();
  if (!code || /[?&]locale=/.test(url)) return url;
  const hashAt = url.indexOf('#');
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  return `${base}${base.includes('?') ? '&' : '?'}locale=${encodeURIComponent(code)}${hash}`;
}
