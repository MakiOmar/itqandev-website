import type { Cookie } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Project } from '../../types/project';

/**
 * Normalize Laravel paginated project list or plain array from ApiClient.get() response.
 */
export function extractProjectsListFromApiResponse(response: unknown): Project[] {
  if (!response || typeof response !== 'object') {
    return [];
  }
  const root = response as { data?: unknown };
  const d = root.data;
  if (Array.isArray(d)) {
    return d as Project[];
  }
  if (d && typeof d === 'object' && 'data' in (d as object)) {
    const inner = (d as { data: unknown }).data;
    if (Array.isArray(inner)) {
      return inner as Project[];
    }
  }
  return [];
}

/**
 * When `settings.features.projects` is false, skip project linking in testimonials.
 * Values come from Laravel `config/features.php` / `.env` only (whitelabel), not from persisted settings.
 */
export function readProjectsManagementEnabled(settings: Record<string, unknown>): boolean {
  const raw = settings.features;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return true;
  }
  const projects = (raw as Record<string, unknown>).projects;
  if (projects === false || projects === 'false' || projects === 0 || projects === '0') {
    return false;
  }
  return true;
}

export type TestimonialFormProjectsContext = {
  projects: Project[];
  projectsManagementEnabled: boolean;
};

/**
 * Shared data for testimonial create/edit: optional project list + feature flag from settings.
 */
export async function loadTestimonialProjectsContext(
  cookie: Cookie | undefined,
  request: { headers: Headers } | undefined,
): Promise<TestimonialFormProjectsContext> {
  const cookieHeader = extractCookieHeader(cookie, request);
  const apiClient = getApiClient(cookieHeader);
  const settingsRes = await apiClient.get<Record<string, unknown>>(API_ENDPOINTS.SETTINGS.GET);
  const settings = (settingsRes?.data ?? {}) as Record<string, unknown>;
  const projectsManagementEnabled = readProjectsManagementEnabled(settings);
  if (!projectsManagementEnabled) {
    return { projects: [], projectsManagementEnabled: false };
  }
  const projectsRes = await apiClient.get(API_ENDPOINTS.PROJECTS.LIST);
  const projects = extractProjectsListFromApiResponse(projectsRes);
  return { projects, projectsManagementEnabled: true };
}
