import '~/styles/admin.css';
import { component$, Slot, useContextProvider } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { AdminSessionContext } from '../../../stores/admin-session-context';
import { AdminSiteTypographyHead } from '../../../components/perf/AdminSiteTypographyHead';
import { AuthenticatedAdminLayout } from '../../../components/dashboard/AuthenticatedAdminLayout';
import { getConfig } from '../../../lib/config';
import { stripUiLocaleFromPathname } from '../../../lib/i18n/ui-locale-path';
import { getFeatureModuleForAdminPath } from '../../../lib/admin/feature-module-routes';
import { defaultProjectSettings, isFeatureModuleEnabled } from '../../../lib/api/project-settings';
import { extractCookieHeader } from '../../../lib/api/client';
import { routesFromPreferredCookie } from '../../../lib/constants/routes';
import { loadAdminAuthSession } from '../../../lib/loaders/admin-auth';
import { isAdminLoginPath, loadAdminSettings } from '../../../lib/loaders/admin-settings';
import { loadPublicSiteMeta } from '../../../lib/loaders/public-site-meta';

/** Route loaders must be declared in this layout module (not lib/) so client chunks never call routeLoader$. */
export const useAdminAuth = routeLoader$(async ({ cookie, url, redirect: redirectFn }) =>
  loadAdminAuthSession(cookie, url, redirectFn),
);

export const useAdminSettings = routeLoader$(async ({ cookie, request, url }) => {
  if (isAdminLoginPath(url.pathname)) {
    return defaultProjectSettings;
  }
  return loadAdminSettings(extractCookieHeader(cookie, request));
});

export const usePublicSiteMeta = routeLoader$(async ({ cookie, request }) =>
  loadPublicSiteMeta(cookie, request),
);

/** Prevent search engines from indexing any dashboard HTML (all child admin routes). */
export const onRequest: RequestHandler = ({ headers }) => {
  headers.set('X-Robots-Tag', 'noindex, nofollow');
};

export const head: DocumentHead = {
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

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
    const settings = await loadAdminSettings(cookieHeader);
    const features = settings?.features;
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

  const adminSettings = useAdminSettings();
  const adminSession = useAdminAuth();
  const siteMeta = usePublicSiteMeta();

  useContextProvider(AdminSessionContext, adminSession);

  useAdminFeatureModuleGuard();

  if (isLoginPage) {
    return (
      <>
        <AdminSiteTypographyHead typography={siteMeta.value.typography} />
        <Slot />
      </>
    );
  }

  return (
    <>
      <AdminSiteTypographyHead typography={siteMeta.value.typography} />
      <AuthenticatedAdminLayout settings={adminSettings.value}>
        <Slot />
      </AuthenticatedAdminLayout>
    </>
  );
});
