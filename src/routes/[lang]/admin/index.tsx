import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { useAppRoutes } from '../../../lib/constants/routes';
import { auth } from '../../../lib/auth';
import type { Project } from '../../../types/project';
import type { Category } from '../../../types/category';
import type { Skill } from '../../../types/skill';
import type { Testimonial } from '../../../types/testimonial';

/**
 * Dashboard metrics interface
 */
interface DashboardMetrics {
  projects: {
    total: number;
    published: number;
    draft: number;
  };
  categories: {
    total: number;
  };
  skills: {
    total: number;
  };
  testimonials: {
    total: number;
  };
}

/**
 * Dashboard metrics route loader - loads real data from API
 */
export const useDashboardMetrics = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    
    // Load all data in parallel with better error handling
    const [projectsRes, categoriesRes, skillsRes, testimonialsRes] = await Promise.allSettled([
      apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS.LIST),
      apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST),
      apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST),
      apiClient.get<Testimonial[]>(API_ENDPOINTS.TESTIMONIALS.LIST),
    ]);

    // Extract data from settled promises, handling paginated responses
    const extractData = <T,>(result: PromiseSettledResult<any>): T[] => {
      if (result.status === 'fulfilled' && result.value?.data) {
        if (Array.isArray(result.value.data)) {
          return result.value.data as T[];
        } else if (result.value.data && typeof result.value.data === 'object' && 'data' in result.value.data && Array.isArray(result.value.data.data)) {
          return result.value.data.data as T[];
        }
      }
      return [];
    };
    
    const projects = projectsRes.status === 'fulfilled' 
      ? extractData<Project>(projectsRes)
      : (console.error('Failed to load projects:', projectsRes.reason), [] as Project[]);
    
    const categories = categoriesRes.status === 'fulfilled'
      ? extractData<Category>(categoriesRes)
      : (console.error('Failed to load categories:', categoriesRes.reason), [] as Category[]);
    
    const skills = skillsRes.status === 'fulfilled'
      ? extractData<Skill>(skillsRes)
      : (console.error('Failed to load skills:', skillsRes.reason), [] as Skill[]);
    
    const testimonialsData = testimonialsRes.status === 'fulfilled'
      ? (testimonialsRes.value?.data ?? {})
      : (console.error('Failed to load testimonials:', testimonialsRes.reason), {});
    
    const testimonials = Array.isArray(testimonialsData) 
      ? testimonialsData 
      : (testimonialsData as any)?.data ?? [];

    const metrics: DashboardMetrics = {
      projects: {
        total: projects.length,
        published: projects.filter((p) => p.status === 'published').length,
        draft: projects.filter((p) => p.status === 'draft').length,
      },
      categories: {
        total: categories.length,
      },
      skills: {
        total: skills.length,
      },
      testimonials: {
        total: testimonials.length,
      },
    };

    return metrics;
  } catch (error: any) {
    console.error('Failed to load dashboard metrics:', error);
    // Return empty metrics on error
    return {
      projects: { total: 0, published: 0, draft: 0 },
      categories: { total: 0 },
      skills: { total: 0 },
      testimonials: { total: 0 },
    };
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
  const R = useAppRoutes();
  const metrics = useDashboardMetrics();
  const userSession = useUserSession();
  const userName = userSession.value?.user?.name || 'User';

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
  title: 'Dashboard - Home',
  meta: [
    {
      name: 'description',
      content: 'Dashboard overview and statistics',
    },
  ],
};
