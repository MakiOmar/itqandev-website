import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { uiLangFromUrlPathname } from '../../../lib/i18n/ui-locale-path';
import { presentationLocaleFromAdminRoute } from '../../../lib/admin/admin-api-client';
import { getConfig } from '../../../lib/config';
import { useAppRoutes } from '../../../lib/constants/routes';
import { auth } from '../../../lib/auth';
import { adminPageTitle } from '../../../lib/admin/page-title';
import {
  EMPTY_DASHBOARD_METRICS,
  fetchDashboardMetrics,
  type DashboardMetrics,
} from '../../../lib/admin/dashboard-metrics';

/**
 * Dashboard metrics route loader - loads real data from API
 */
export const useDashboardMetrics = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const presentationLocale = presentationLocaleFromAdminRoute(cookie, request, params.lang);
    return await fetchDashboardMetrics(request.headers.get('cookie'), presentationLocale);
  } catch (error: unknown) {
    console.error('Failed to load dashboard metrics:', error);
    return EMPTY_DASHBOARD_METRICS;
  }
});

/**
 * Get current user session
 */
export const useUserSession = routeLoader$(async ({ cookie }) => {
  try {
    const session = await auth.getSession(cookie);
    return session;
  } catch {
    return null;
  }
});

/**
 * Admin dashboard home page
 */
export default component$(() => {
  const { lang } = useTranslate();
  const location = useLocation();
  const R = useAppRoutes();
  const metricsLoader = useDashboardMetrics();
  const metrics = useSignal<DashboardMetrics>(metricsLoader.value);
  const userSession = useUserSession();
  const userName = userSession.value?.user?.name || 'User';

  // SSR may return zeros when Node cannot reach WAMP; hydrate from browser /api proxy.
  useVisibleTask$(async ({ track }) => {
    const pathname = track(() => location.url.pathname);
    const config = getConfig();
    const sessionKey = config.auth.cookieName;
    const session = userSession.value;
    if (session?.token && session.token !== 'sanctum_cookie') {
      const existing = localStorage.getItem(sessionKey);
      if (!existing) {
        localStorage.setItem(sessionKey, JSON.stringify(session));
      }
    }

    const presentationLocale = uiLangFromUrlPathname(pathname);

    try {
      const next = await fetchDashboardMetrics(undefined, presentationLocale);
      metrics.value = next;
    } catch (error) {
      console.warn('[dashboard] client metrics refresh failed', error);
    }
  });

  return (
    <>
      {/* Component: AdminDashboardIndex */}
      <div>
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {translateApp(lang, 'dashboard.welcome', { name: userName })}
          </h1>
          <p class="text-gray-600 dark:text-gray-400">{translateApp(lang, 'dashboard.overview')}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Your role: <span class="font-semibold capitalize">{userSession.value?.user?.role || 'Unknown'}</span>
          </p>
        </div>

        {/* Statistics Cards - Matching Vue Dashboard */}
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Projects Card */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{translateApp(lang, 'dashboard.projects')}</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.value.projects.total}</p>
                <div class="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{translateApp(lang, 'dashboard.published')}: {metrics.value.projects.published}</span>
                  <span>{translateApp(lang, 'dashboard.draft')}: {metrics.value.projects.draft}</span>
                </div>
              </div>
              <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900/20">
                <span class="text-2xl">💼</span>
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{translateApp(lang, 'dashboard.categories')}</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.value.categories.total}</p>
              </div>
              <div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
                <span class="text-2xl">📁</span>
              </div>
            </div>
          </div>

          {/* Skills Card */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{translateApp(lang, 'dashboard.skills')}</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.value.skills.total}</p>
              </div>
              <div class="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                <span class="text-2xl">⚡</span>
              </div>
            </div>
          </div>

          {/* Testimonials Card */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{translateApp(lang, 'dashboard.testimonials')}</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.value.testimonials.total}</p>
              </div>
              <div class="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
                <span class="text-2xl">⭐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section - Matching Vue Dashboard */}
        <div class="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'dashboard.quickActions')}</h2>
          <div class="grid gap-4 md:grid-cols-3">
            <Link
              href={R.ADMIN.PROJECTS_NEW}
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <span class="text-2xl">➕</span>
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{translateApp(lang, 'dashboard.addNewProject')}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'dashboard.addNewProjectDesc')}</p>
              </div>
            </Link>
            <Link
              href={R.ADMIN.CATEGORIES}
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <span class="text-2xl">📁</span>
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{translateApp(lang, 'dashboard.manageCategories')}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'dashboard.manageCategoriesDesc')}</p>
              </div>
            </Link>
            <Link
              href={R.ADMIN.SKILLS}
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <span class="text-2xl">⚡</span>
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{translateApp(lang, 'dashboard.manageSkills')}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'dashboard.manageSkillsDesc')}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: adminPageTitle('Home'),
  meta: [
    {
      name: 'description',
      content: 'Dashboard overview and statistics',
    },
  ],
};
