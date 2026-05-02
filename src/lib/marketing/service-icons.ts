import type { Service } from '~/lib/marketing/types';
import { publicMarketingAssetUrl } from '~/lib/marketing/public-asset-url';

/** Preset icon keywords for admin forms (matches `/public/icons` + SLUG_TO_ICON). */
export const SERVICE_ICON_SELECT_VALUES = [
  'web',
  'android',
  'ios',
  'cross-platform',
  'ui-ux',
  'api',
] as const;

/** Map stored aliases to the canonical `<select>` value (bare keywords only). */
export function normalizeServiceIconKeyForSelect(stored: string | null | undefined): string {
  const raw = (stored ?? '').trim();
  if (!raw) {
    return '';
  }
  const t = raw.toLowerCase();
  if (t === 'uiux') {
    return 'ui-ux';
  }
  if (t === 'api-backend') {
    return 'api';
  }
  if ((SERVICE_ICON_SELECT_VALUES as readonly string[]).includes(t)) {
    return t;
  }
  return raw;
}

/** True when `stored` is a preset keyword (including known aliases). */
export function isPresetServiceIconKey(stored: string | null | undefined): boolean {
  const raw = (stored ?? '').trim();
  if (!raw) {
    return false;
  }
  const t = raw.toLowerCase();
  if (t === 'uiux' || t === 'api-backend') {
    return true;
  }
  return (SERVICE_ICON_SELECT_VALUES as readonly string[]).includes(t);
}

/** Value bound to `<select>`: preset → canonical key; otherwise raw (custom URL/path). */
export function serviceIconSelectBoundValue(stored: string | null | undefined): string {
  const raw = (stored ?? '').trim();
  if (!raw) {
    return '';
  }
  if (isPresetServiceIconKey(raw)) {
    return normalizeServiceIconKeyForSelect(raw);
  }
  return raw;
}

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

/**
 * Icon URL for a service card.
 * - CMS may send a bare keyword (`"web"`, `"api"`) — same as site.json — mapped to /icons/*.svg.
 * - Or a path with extension (`/icons/foo.svg`, `storage/x.png`) under the app base.
 * - Else slug maps via SLUG_TO_ICON; default web.svg.
 */
export function resolveServiceIconUrl(service: Pick<Service, 'slug' | 'icon'>): string {
  const raw = service.icon?.trim();
  if (!raw) {
    return publicMarketingAssetUrl(SLUG_TO_ICON[service.slug] ?? '/icons/web.svg');
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
    return raw;
  }
  if (hasAssetExtension(raw)) {
    const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
    return publicMarketingAssetUrl(path);
  }
  // Bare keyword from JSON/API (e.g. "web", "ui-ux") — not a filesystem path
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) {
    const path = SLUG_TO_ICON[raw] ?? `/icons/${raw}.svg`;
    return publicMarketingAssetUrl(path);
  }
  const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
  return publicMarketingAssetUrl(path);
}
