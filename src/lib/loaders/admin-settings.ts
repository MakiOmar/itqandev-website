import { routeLoader$ } from '@builder.io/qwik-city';
import { extractCookieHeader } from '../api/client';
import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { defaultProjectSettings, type ProjectSettings } from '../api/project-settings';
import { shouldSkipSsrMarketingApi } from '../marketing/ssr-api-reachability';

export async function loadAdminSettings(cookieHeader: string | null): Promise<ProjectSettings> {
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return defaultProjectSettings;
  }

  try {
    const apiClient = getApiClient(cookieHeader ?? undefined);
    const response = await apiClient.get<{ data?: ProjectSettings } | ProjectSettings>(API_ENDPOINTS.SETTINGS.GET);
    const payload = (response?.data as { data?: ProjectSettings } | ProjectSettings | undefined) ?? response;
    const settings =
      payload && typeof payload === 'object' && 'data' in payload && payload.data
        ? payload.data
        : (payload as ProjectSettings);
    return settings && typeof settings === 'object' ? (settings as ProjectSettings) : defaultProjectSettings;
  } catch {
    return defaultProjectSettings;
  }
}

/**
 * One authenticated GET /api/settings for admin layout, feature guard, and settings context.
 */
export const useAdminSettings = routeLoader$(async ({ cookie, request }): Promise<ProjectSettings> => {
  return loadAdminSettings(extractCookieHeader(cookie, request));
});
