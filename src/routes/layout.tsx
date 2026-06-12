import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { auth } from '../lib/auth';
import { getConfig } from '../lib/config';
import { NavigationIndicator } from '../components/navigation-indicator/navigation-indicator';
import { pathnameHasUiLocale, stripUiLocaleFromPathname, uiLangFromPreferredCookie, uiLangPrefixFromPathname, withUiLocale } from '../lib/i18n/ui-locale-path';
import { getLocalizedRoutes } from '../lib/constants/routes';

/**
 * Prefix bare paths with `/en` or `/ar` so the URL always reflects UI locale.
 * Skips API, static assets, and already-localized URLs.
 */
export const onRequest: RequestHandler = ({ url, locale, redirect: redirectFn, cookie }) => {
  const pathname = url.pathname;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  let path = pathname;
  if (base && base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length) || '/';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  const fallbackLang = uiLangFromPreferredCookie(cookie);

  if (path.startsWith('/api')) {
    locale(fallbackLang);
    return;
  }

  const leaf = path.split('/').pop() || '';
  if (leaf.includes('.') && !pathnameHasUiLocale(path)) {
    locale(fallbackLang);
    return;
  }

  if (pathnameHasUiLocale(path)) {
    const urlLang = uiLangPrefixFromPathname(path);
    if (urlLang) {
      locale(urlLang);
    }
    return;
  }

  const target = (base && base !== '/' ? base : '') + withUiLocale(fallbackLang, path) + (url.search || '');
  throw redirectFn(302, target);
};

/**
 * Request handler for caching and performance optimization
 */
export const onGet: RequestHandler = async ({ cacheControl, url }) => {
  const pathname = url.pathname;
  const logical = stripUiLocaleFromPathname(pathname);
  const config = getConfig();

  if (logical === config.routes.admin.login || logical === config.routes.public.login || pathname.startsWith('/api/')) {
    cacheControl({
      maxAge: 0,
      sMaxAge: 0,
      staleWhileRevalidate: 0,
    });
  } else if (logical.startsWith(config.routes.admin.prefix)) {
    cacheControl({
      maxAge: 0,
      sMaxAge: 0,
      staleWhileRevalidate: 0,
    });
  } else if (logical === config.routes.public.home) {
    cacheControl({
      maxAge: 60,
      sMaxAge: 300,
      staleWhileRevalidate: 86400,
    });
  } else {
    cacheControl({
      maxAge: 300,
      sMaxAge: 600,
      staleWhileRevalidate: 86400,
    });
  }
};

/**
 * Server-side authentication route loader
 * Checks authentication status and handles redirects
 * Note: This loader runs on all routes, but skips login page and API routes
 */
export const useAuth = routeLoader$(async ({ cookie, url, redirect: redirectFn }) => {
  const pathname = url.pathname;
  const config = getConfig();
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const logicalPath = stripUiLocaleFromPathname(normalizedPath);
  const lang = uiLangFromPreferredCookie(cookie);
  const R = getLocalizedRoutes(lang);

  const isAdminLoginPage =
    logicalPath === config.routes.admin.login || normalizedPath.endsWith('/admin/login');
  const isPublicLoginPage = logicalPath === config.routes.public.login || normalizedPath.endsWith('/login');
  const isLoginPage = isAdminLoginPage || isPublicLoginPage;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = logicalPath === config.routes.public.home || logicalPath.startsWith('/public');
  const isAdminRoute = logicalPath.startsWith(config.routes.admin.prefix);

  if (isLoginPage) {
    try {
      const session = await auth.getSession(cookie);
      if (session) {
        throw redirectFn(302, R.ADMIN.HOME);
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }
      if (import.meta.env.DEV) {
        console.warn('Auth check on login page failed, allowing access:', error);
      }
    }
    return null;
  }

  if (isApiRoute || (isPublicRoute && !isAdminRoute)) {
    return null;
  }

  if (isAdminRoute && !isLoginPage) {
    try {
      const session = await auth.getSession(cookie);
      return session;
    } catch {
      return null;
    }
  }

  return null;
});

/**
 * Root layout - handles authentication and redirects
 */
export default component$(() => {
  return (
    <>
      <NavigationIndicator />
      <Slot />
    </>
  );
});
