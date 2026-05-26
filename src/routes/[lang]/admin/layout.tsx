import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { AuthenticatedAdminLayout } from '../../../components/dashboard/AuthenticatedAdminLayout';
import { getConfig } from '../../../lib/config';
import { stripUiLocaleFromPathname } from '../../../lib/i18n/ui-locale-path';
import { getFeatureModuleForAdminPath } from '../../../lib/admin/feature-module-routes';
import { isFeatureModuleEnabled } from '../../../lib/api/project-settings';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { extractCookieHeader } from '../../../lib/api/client';
import { getApiClient } from '../../../lib/api/client';
import { routesFromPreferredCookie } from '../../../lib/constants/routes';
import { useAdminAuth } from '../../../lib/loaders/admin-auth';

export { useAdminAuth };

/**
 * Site languages for admin content forms (must be re-exported from a route file — see Qwik routeLoader$ rules).
 */
export { useSiteLanguageConfig } from '../../../lib/loaders/site-language-config';

/**
 * Redirect when visiting a disabled feature module admin route directly.
 */
export const useAdminFeatureModuleGuard = routeLoader$(async ({ cookie, request, url, redirect: redirectFn }) => {
  const module = getFeatureModuleForAdminPath(url.pathname);
  if (!module) {
    return null;
  }

  const R = routesFromPreferredCookie(cookie);
  const logicalPath = stripUiLocaleFromPathname(url.pathname.replace(/\/+$/, '') || '/');
  const isLoginPage = logicalPath === '/admin/login' || logicalPath.endsWith('/admin/login');
  if (isLoginPage) {
    return null;
  }

  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<{ features?: Record<string, boolean> }>(API_ENDPOINTS.SETTINGS.GET);
    const features =
      (response?.data as { features?: Record<string, boolean> } | undefined)?.features ??
      (response as { features?: Record<string, boolean> }).features;
    if (!isFeatureModuleEnabled(features, module)) {
      throw redirectFn(302, R.ADMIN.HOME);
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
  }

  return null;
});

/**
 * Admin layout: login route renders only <Slot /> (no useVisibleTask QRLs).
 * Authenticated routes use AuthenticatedAdminLayout for sidebar/header client hooks.
 */
export default component$(() => {
  const location = useLocation();
  const config = getConfig();
  const pathname = location.url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const logicalPath = stripUiLocaleFromPathname(normalizedPath);
  const isLoginPage =
    logicalPath === config.routes.admin.login || logicalPath === '/admin/login';

  useAdminAuth();
  useAdminFeatureModuleGuard();

  if (isLoginPage) {
    return <Slot />;
  }

  return (
    <AuthenticatedAdminLayout>
      <Slot />
    </AuthenticatedAdminLayout>
  );
});
