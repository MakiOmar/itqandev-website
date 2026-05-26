import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { isFeatureModuleEnabled } from '../api/project-settings';
import type { Project } from '../../types/project';
import type { Category } from '../../types/category';
import type { Skill } from '../../types/skill';
import type { Testimonial } from '../../types/testimonial';

export interface DashboardMetrics {
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
  blog: {
    total: number;
    published: number;
  };
  services: {
    total: number;
  };
  media: {
    total: number;
  };
}

export const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  projects: { total: 0, published: 0, draft: 0 },
  categories: { total: 0 },
  skills: { total: 0 },
  testimonials: { total: 0 },
  blog: { total: 0, published: 0 },
  services: { total: 0 },
  media: { total: 0 },
};

function extractListData<T>(result: PromiseSettledResult<unknown>): T[] {
  if (result.status !== 'fulfilled' || !result.value || typeof result.value !== 'object') {
    return [];
  }
  const payload = (result.value as { data?: unknown }).data;
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function extractTotalCount(result: PromiseSettledResult<unknown>): number {
  const items = extractListData(result);
  if (result.status !== 'fulfilled' || !result.value || typeof result.value !== 'object') {
    return items.length;
  }
  const payload = (result.value as { data?: unknown }).data;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const meta = (payload as { meta?: { total?: number } }).meta;
    if (meta && typeof meta.total === 'number') {
      return meta.total;
    }
  }
  return items.length;
}

/**
 * Load dashboard stat cards from authenticated admin API endpoints.
 * Works server-side (routeLoader$ + cookies) and client-side (localStorage token + /api proxy).
 */
export async function fetchDashboardMetrics(cookieHeader?: string | null): Promise<DashboardMetrics> {
  // Omit X-Content-Locale: dashboard totals should reflect all records, not locale-filtered lists.
  const apiClient = getApiClient(cookieHeader ?? undefined, false);

  let features: Record<string, boolean> | undefined;
  try {
    const settingsRes = await apiClient.get<{ features?: Record<string, boolean> }>(API_ENDPOINTS.SETTINGS.GET);
    features = (settingsRes?.data as { features?: Record<string, boolean> } | undefined)?.features ?? undefined;
  } catch {
    features = undefined;
  }

  const fetches = await Promise.allSettled([
    isFeatureModuleEnabled(features, 'projects')
      ? apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'categories')
      ? apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'skills')
      ? apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'testimonials')
      ? apiClient.get<Testimonial[]>(API_ENDPOINTS.TESTIMONIALS.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'blog')
      ? apiClient.get<unknown[]>(API_ENDPOINTS.BLOG.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'services')
      ? apiClient.get<unknown[]>(API_ENDPOINTS.SERVICES.LIST)
      : Promise.resolve({ data: [] }),
    isFeatureModuleEnabled(features, 'media')
      ? apiClient.get<unknown>(`${API_ENDPOINTS.MEDIA.LIST}?per_page=1`)
      : Promise.resolve({ data: { total: 0 } }),
  ]);

  const [projectsRes, categoriesRes, skillsRes, testimonialsRes, blogRes, servicesRes, mediaRes] = fetches;

  const projects = extractListData<Project>(projectsRes);
  const blogList = extractListData<{ status?: string }>(blogRes);

  let mediaTotal = 0;
  if (mediaRes.status === 'fulfilled' && mediaRes.value) {
    const md = (mediaRes.value as { data?: { total?: number } }).data;
    if (md && typeof md === 'object' && 'total' in md && typeof md.total === 'number') {
      mediaTotal = md.total;
    } else {
      mediaTotal = extractListData(mediaRes).length;
    }
  }

  return {
    projects: {
      total: extractTotalCount(projectsRes),
      published: projects.filter((p) => p.status === 'published').length,
      draft: projects.filter((p) => p.status === 'draft').length,
    },
    categories: { total: extractTotalCount(categoriesRes) },
    skills: { total: extractTotalCount(skillsRes) },
    testimonials: { total: extractTotalCount(testimonialsRes) },
    blog: {
      total: extractTotalCount(blogRes),
      published: blogList.filter((b) => b.status === 'published').length,
    },
    services: { total: extractTotalCount(servicesRes) },
    media: { total: mediaTotal },
  };
}
