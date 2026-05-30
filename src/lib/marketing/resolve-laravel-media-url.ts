/**
 * Resolve Laravel `/storage/...` and other backend media URLs for the Qwik origin.
 * Preview (:4173) and dev (:5173) are not Laravel — relative paths must use the API origin.
 */

import { publicMarketingAssetUrl } from './public-asset-url';

function envString(key: string): string {
  const v = import.meta.env?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Public Laravel origin (no /api suffix). */
export function laravelPublicOrigin(): string {
  const site = envString('VITE_SITE_URL');
  if (site && /^https?:\/\//i.test(site)) {
    return trimSlash(site);
  }
  const proxy = envString('VITE_API_PROXY_TARGET');
  if (proxy && /^https?:\/\//i.test(proxy)) {
    return trimSlash(proxy);
  }
  const apiBase = envString('VITE_MARKETING_API_URL') || envString('VITE_API_BASE_URL');
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    try {
      return new URL(apiBase).origin;
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

function isLaravelStoragePath(pathname: string): boolean {
  return pathname.startsWith('/storage/') || pathname.startsWith('/media/');
}

/**
 * Turn relative Laravel media paths into absolute URLs on the backend origin.
 * Absolute URLs pointing at /storage on another host are rewritten when VITE_* origin is set.
 */
export function resolveLaravelMediaUrl(src: string | null | undefined): string {
  const s = src?.trim();
  if (!s) {
    return '';
  }

  const backendOrigin = laravelPublicOrigin();

  if (s.startsWith('//')) {
    return `https:${s}`;
  }

  if (s.startsWith('http://') || s.startsWith('https://')) {
    if (!backendOrigin) {
      return s;
    }
    try {
      const parsed = new URL(s);
      if (isLaravelStoragePath(parsed.pathname)) {
        const target = new URL(backendOrigin);
        if (parsed.origin !== target.origin) {
          return `${trimSlash(backendOrigin)}${parsed.pathname}${parsed.search}`;
        }
      }
    } catch {
      /* keep original */
    }
    return s;
  }

  const path = s.startsWith('/') ? s : `/${s}`;
  if (path.startsWith('/storage/') || path.startsWith('/media/')) {
    if (backendOrigin) {
      return `${trimSlash(backendOrigin)}${path}`;
    }
  }

  return publicMarketingAssetUrl(path);
}

/** Normalize branding logo fields from GET /api/public/site-meta. */
export function resolveBrandingLogoUrls<T extends Record<string, unknown>>(settings: T): T {
  const keys = [
    'logo',
    'site_logo',
    'logoDark',
    'logo_dark',
    'dark_logo',
    'site_logo_dark',
    'logoLight',
    'logo_light',
    'light_logo',
    'site_logo_light',
    'favicon',
    'site_favicon',
  ] as const;

  const out = { ...settings } as T;
  for (const key of keys) {
    if (key in out && typeof out[key] === 'string') {
      (out as Record<string, unknown>)[key] = resolveLaravelMediaUrl(out[key] as string);
    }
  }
  return out;
}

export type PublicBrandingFields = {
  name: string;
  logo: string;
  logoDark: string;
  logoLight: string;
};

/** Map site-meta / settings API payload to header/footer branding with resolved logo URLs. */
export function mapPublicBrandingFromApi(
  settings: Record<string, unknown> | null | undefined,
  fallbackName: string,
): PublicBrandingFields {
  const s = resolveBrandingLogoUrls(settings ?? {});
  const name =
    (typeof s.site_name === 'string' && s.site_name) ||
    (typeof s.name === 'string' && s.name) ||
    fallbackName;
  const logo =
    resolveLaravelMediaUrl(
      (typeof s.logo === 'string' && s.logo) || (typeof s.site_logo === 'string' && s.site_logo) || '',
    );
  const logoDark = resolveLaravelMediaUrl(
    (typeof s.logoDark === 'string' && s.logoDark) ||
      (typeof s.logo_dark === 'string' && s.logo_dark) ||
      (typeof s.dark_logo === 'string' && s.dark_logo) ||
      (typeof s.site_logo_dark === 'string' && s.site_logo_dark) ||
      '',
  );
  const logoLight = resolveLaravelMediaUrl(
    (typeof s.logoLight === 'string' && s.logoLight) ||
      (typeof s.logo_light === 'string' && s.logo_light) ||
      (typeof s.light_logo === 'string' && s.light_logo) ||
      (typeof s.site_logo_light === 'string' && s.site_logo_light) ||
      '',
  );
  return { name, logo, logoDark, logoLight };
}
