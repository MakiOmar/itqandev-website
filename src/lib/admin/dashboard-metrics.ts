import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { shouldSkipSsrMarketingApi } from '../marketing/ssr-api-reachability';

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

/**
 * Load dashboard stat cards from GET /api/v1/dashboard/metrics (single round-trip).
 */
export async function fetchDashboardMetrics(
  cookieHeader?: string | null,
  _presentationLocale?: string,
): Promise<DashboardMetrics> {
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return EMPTY_DASHBOARD_METRICS;
  }

  try {
    const apiClient = getApiClient(cookieHeader ?? undefined);
    const response = await apiClient.get<{ data?: DashboardMetrics } | DashboardMetrics>(
      API_ENDPOINTS.DASHBOARD.METRICS,
    );
    const payload = (response?.data as { data?: DashboardMetrics } | DashboardMetrics | undefined) ?? response;
    let metrics: DashboardMetrics | null = null;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const wrapped = (payload as { data?: DashboardMetrics }).data;
      if (wrapped) {
        metrics = wrapped;
      }
    } else if (payload && typeof payload === 'object' && 'projects' in payload) {
      metrics = payload as DashboardMetrics;
    }
    if (!metrics) {
      return EMPTY_DASHBOARD_METRICS;
    }
    return {
      projects: metrics.projects ?? EMPTY_DASHBOARD_METRICS.projects,
      categories: metrics.categories ?? EMPTY_DASHBOARD_METRICS.categories,
      skills: metrics.skills ?? EMPTY_DASHBOARD_METRICS.skills,
      testimonials: metrics.testimonials ?? EMPTY_DASHBOARD_METRICS.testimonials,
      blog: metrics.blog ?? EMPTY_DASHBOARD_METRICS.blog,
      services: metrics.services ?? EMPTY_DASHBOARD_METRICS.services,
      media: metrics.media ?? EMPTY_DASHBOARD_METRICS.media,
    };
  } catch {
    return EMPTY_DASHBOARD_METRICS;
  }
}
