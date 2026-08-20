import { createContextId, type Signal } from '@builder.io/qwik';
import { stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';

/**
 * When true, marketing links use a real `<a>` (full document load) instead of
 * Qwik City SPA `Link`. Needed on HTTP 404 routes: client navigation to `/[lang]/`
 * (home) is intercepted by `Link` but does not complete, so the logo/home click
 * appears to do nothing.
 */
export const PublicDocumentNavContext = createContextId<Signal<boolean>>('public-document-nav');

const KNOWN_PUBLIC_PREFIXES = [
  '/services',
  '/portfolio',
  '/work',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
  '/pages',
  '/forms',
] as const;

/** True on unknown public URLs (and Theme `not_found`) where SPA home navigation is unreliable. */
export function shouldUsePublicDocumentNav(
  pathname: string,
  themeContext?: string | null,
): boolean {
  if (themeContext === 'not_found') {
    return true;
  }
  const logical = stripUiLocaleFromPathname(pathname || '/').replace(/\/+$/, '') || '/';
  if (logical === '/' || logical === '') {
    return false;
  }
  return !KNOWN_PUBLIC_PREFIXES.some(
    (prefix) => logical === prefix || logical.startsWith(`${prefix}/`),
  );
}
