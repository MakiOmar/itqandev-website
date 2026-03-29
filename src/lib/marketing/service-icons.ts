import type { Service } from '~/lib/marketing/types';

/** Public static icons under /icons (see website/public/icons). */
const SLUG_TO_ICON: Record<string, string> = {
  web: '/icons/web.svg',
  android: '/icons/android.svg',
  ios: '/icons/ios.svg',
  'cross-platform': '/icons/cross-platform.svg',
  'ui-ux': '/icons/uiux.svg',
  uiux: '/icons/uiux.svg',
  'api-backend': '/icons/ap.svg',
  api: '/icons/ap.svg',
};

function hasAssetExtension(s: string): boolean {
  return /\.(svg|png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(s);
}

/** Join Vite `base` with a root-absolute path like `/icons/x.svg`. */
function publicAssetUrl(rootPath: string): string {
  const base = (import.meta.env.BASE_URL as string) || '/';
  const rel = rootPath.startsWith('/') ? rootPath.slice(1) : rootPath;
  return base.endsWith('/') ? `${base}${rel}` : `${base}/${rel}`;
}

/**
 * Icon URL for a service card.
 * - CMS may send a bare keyword (`"web"`, `"api"`) — same as site.json — mapped to /icons/*.svg.
 * - Or a path with extension (`/icons/foo.svg`, `storage/x.png`) under the app base.
 * - Else slug maps via SLUG_TO_ICON; default web.svg.
 */
export function resolveServiceIconUrl(service: Pick<Service, 'slug' | 'icon'>): string {
  const raw = service.icon?.trim();
  if (!raw) {
    return publicAssetUrl(SLUG_TO_ICON[service.slug] ?? '/icons/web.svg');
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
    return raw;
  }
  if (hasAssetExtension(raw)) {
    const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
    return publicAssetUrl(path);
  }
  // Bare keyword from JSON/API (e.g. "web", "ui-ux") — not a filesystem path
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) {
    const path = SLUG_TO_ICON[raw] ?? `/icons/${raw}.svg`;
    return publicAssetUrl(path);
  }
  const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
  return publicAssetUrl(path);
}
