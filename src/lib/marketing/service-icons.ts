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

/**
 * Icon URL for a service card: CMS `icon` wins; else map slug to /icons/*.svg; else web default.
 */
export function resolveServiceIconUrl(service: Pick<Service, 'slug' | 'icon'>): string {
  const raw = service.icon?.trim();
  if (raw) {
    if (raw.startsWith('http') || raw.startsWith('//')) return raw;
    return raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
  }
  return SLUG_TO_ICON[service.slug] ?? '/icons/web.svg';
}
