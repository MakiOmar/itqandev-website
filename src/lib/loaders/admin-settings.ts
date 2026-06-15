import { extractCookieHeader } from '../api/client';
import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { defaultProjectSettings, type ProjectSettings } from '../api/project-settings';
import { stripUiLocaleFromPathname } from '../i18n/ui-locale-path';
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

/** Skip settings API on login route (no session yet). */
export function isAdminLoginPath(pathname: string): boolean {
  const logicalPath = stripUiLocaleFromPathname(pathname.replace(/\/+$/, '') || '/');
  return logicalPath === '/admin/login' || logicalPath.endsWith('/admin/login');
}
