import { stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';

const PUBLIC_MARKETING_PREFIXES = [
  '/services',
  '/work',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
] as const;

/** Public marketing pages (logical path after UI locale strip). */
export function isPublicMarketingPath(pathname: string): boolean {
  const logical = stripUiLocaleFromPathname(pathname || '/').replace(/\/+$/, '') || '/';
  if (logical === '/' || logical === '') {
    return true;
  }
  return PUBLIC_MARKETING_PREFIXES.some(
    (prefix) => logical === prefix || logical.startsWith(`${prefix}/`),
  );
}

/**
 * When `VITE_DISABLE_GOOGLE_FONTS=true`, skip external fonts only on the public site.
 * Admin/dashboard routes always load Google Fonts.
 */
export function shouldDisableGoogleFontsForPath(pathname: string): boolean {
  return (
    import.meta.env?.VITE_DISABLE_GOOGLE_FONTS === 'true' && isPublicMarketingPath(pathname)
  );
}
