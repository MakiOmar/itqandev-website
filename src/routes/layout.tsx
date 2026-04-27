import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { auth } from '../lib/auth';
import { getConfig } from '../lib/config';
import { speakConfig } from '../lib/i18n/config';
import { NavigationIndicator } from '../components/navigation-indicator/navigation-indicator';

/**
 * Request handler to set locale based on cookie or default
 * Respects user preference stored in cookies
 */
export const onRequest: RequestHandler = ({ locale, cookie }) => {
  // Check if user has a preferred locale in cookie
  const preferredLocale = cookie.get('preferred-locale')?.value;
  
  // Use preferred locale if valid, otherwise use default
  const localeToUse = (preferredLocale && (preferredLocale === 'en' || preferredLocale === 'ar')) 
    ? preferredLocale 
    : speakConfig.defaultLocale.lang;
  
  locale(localeToUse);
};

/**
 * Request handler for caching and performance optimization
 */
export const onGet: RequestHandler = async ({ cacheControl, url }) => {
  // Cache static assets and public pages
  const pathname = url.pathname;
  
  const config = getConfig();
  // Don't cache login page or API routes
  if (pathname === config.routes.admin.login || pathname === config.routes.public.login || pathname.startsWith('/api/')) {
    cacheControl({
      maxAge: 0,
      sMaxAge: 0,
      staleWhileRevalidate: 0,
    });
  } else if (pathname.startsWith(config.routes.admin.prefix) || pathname === config.routes.public.home) {
    // Cache dashboard pages with stale-while-revalidate
    cacheControl({
      maxAge: 60,
      sMaxAge: 300,
      staleWhileRevalidate: 86400,
    });
  } else {
    // Default caching for other pages
    cacheControl({
      maxAge: 300,
      sMaxAge: 600,
      staleWhileRevalidate: 3600,
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
  // Check if this is the login page or API route (with or without trailing slash)
  // Use more robust checking to handle all variations
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isAdminLoginPage = normalizedPath === config.routes.admin.login || normalizedPath === '/admin/login';
  const isPublicLoginPage = normalizedPath === config.routes.public.login || normalizedPath === '/login';
  const isLoginPage = isAdminLoginPage || isPublicLoginPage;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = pathname === config.routes.public.home || pathname.startsWith('/public');
  const isAdminRoute = pathname.startsWith(config.routes.admin.prefix);

  // For login page: if logged in, redirect to admin home; if not, allow access
  if (isLoginPage) {
    try {
      const session = await auth.getSession(cookie);
      if (session) {
        // Already logged in, redirect to admin home
        throw redirectFn(302, config.routes.admin.home);
      }
    } catch (error) {
      // If getSession fails (e.g., API not available), allow access to login page
      // This prevents redirect loops when Laravel backend is not accessible
      if (import.meta.env.DEV) {
        console.warn('Auth check on login page failed, allowing access:', error);
      }
    }
    // Not logged in, allow access to login page
    return null;
  }

  // Skip API routes and public routes (except admin routes)
  if (isApiRoute || (isPublicRoute && !isAdminRoute)) {
    return null;
  }

  // For admin routes (except login), check authentication but don't redirect
  // The admin layout will handle showing login form if not authenticated
  if (isAdminRoute && !isLoginPage) {
    try {
      const session = await auth.getSession(cookie);
      // Return session or null - let the admin layout decide what to show
      return session;
    } catch {
      // If auth check fails, return null - admin layout will show login
      return null;
    }
  }

  // For other routes, return null (public access)
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
