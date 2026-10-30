import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { resolveAdminSettings } from '../api/feature-modules';
import {
  defaultProjectSettings,
  unavailableProjectSettings,
  type ProjectSettings,
} from '../api/project-settings';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { stripUiLocaleFromPathname } from '../i18n/ui-locale-path';
import { shouldSkipSsrMarketingApi } from '../marketing/ssr-api-reachability';

/**
 * Dashboard settings. Admins get the full GET /api/settings body; other roles get the module flags
 * from public site-meta; an unreachable backend yields `unavailableProjectSettings` (all modules off).
 */
export async function loadAdminSettings(cookieHeader: string | null): Promise<ProjectSettings> {
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return defaultProjectSettings;
  }

  const apiClient = getApiClient(cookieHeader ?? undefined);
  const resolved = await resolveAdminSettings(
    () => apiClient.get(API_ENDPOINTS.SETTINGS.GET),
    () => apiClient.get(MARKETING_ENDPOINTS.siteMeta),
  );

  if (resolved.source === 'unavailable') {
    if (import.meta.env.DEV) {
      console.warn('[admin] Settings and site-meta are unreachable; check VITE_API_PROXY_TARGET / VITE_SSR_API_BASE_URL.');
    }
    return unavailableProjectSettings;
  }
  if (resolved.source === 'settings') {
    return { ...(resolved.payload as ProjectSettings), features: resolved.features };
  }
  return { ...defaultProjectSettings, features: resolved.features };
}

/** Skip settings API on login route (no session yet). */
export function isAdminLoginPath(pathname: string): boolean {
  const logicalPath = stripUiLocaleFromPathname(pathname.replace(/\/+$/, '') || '/');
  return logicalPath === '/admin/login' || logicalPath.endsWith('/admin/login');
}
