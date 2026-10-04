/**
 * Favicon `<link>` from the Settings → Branding favicon (site-meta `favicon`).
 * Layout `head` exports add it; `RouterHead` keeps `/favicon.svg` only when no layout did.
 */

export type FaviconLink = { rel: 'icon'; href: string; type?: string };

const MIME_BY_EXTENSION: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  webp: 'image/webp',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

/** Only http(s) or same-origin paths reach `href`. */
function isSafeIconHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//'));
}

export function faviconLink(url: unknown): FaviconLink | null {
  const href = typeof url === 'string' ? url.trim() : '';
  if (!href || !isSafeIconHref(href)) return null;
  const ext = href.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  const type = MIME_BY_EXTENSION[ext];
  return type ? { rel: 'icon', href, type } : { rel: 'icon', href };
}
