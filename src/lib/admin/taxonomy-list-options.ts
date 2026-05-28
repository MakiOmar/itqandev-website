import { getApiClient } from '../api/client';
import { adminApiClient } from './admin-api-client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Category } from '../../types';
import type { Skill } from '../../types';

export type TaxonomyListOptions = {
  categories: Category[];
  skills: Skill[];
};

export function extractApiListPayload<T>(response: unknown): T[] {
  const root = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(root)) {
    return root as T[];
  }
  if (root && typeof root === 'object' && 'data' in (root as object)) {
    const nested = (root as { data: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }
  return [];
}

async function fetchTaxonomyListOptionsWithClient(
  apiClient: ReturnType<typeof getApiClient>,
): Promise<TaxonomyListOptions> {
  const [categoriesRes, skillsRes] = await Promise.all([
    apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST),
    apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST),
  ]);

  let categories = extractApiListPayload<Category>(categoriesRes);
  if (categories.length === 0) {
    const raw = (categoriesRes as { data?: unknown })?.data ?? categoriesRes;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as { data?: Category[] };
        if (Array.isArray(parsed?.data)) {
          categories = parsed.data;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return {
    categories,
    skills: extractApiListPayload<Skill>(skillsRes),
  };
}

/** Categories + skills for admin forms (client refetch or explicit cookie + locale). */
export async function fetchTaxonomyListOptions(
  cookieHeader: string | null | undefined,
  presentationLocale: string,
): Promise<TaxonomyListOptions> {
  const apiClient = getApiClient(cookieHeader ?? undefined, presentationLocale);
  return fetchTaxonomyListOptionsWithClient(apiClient);
}

/** SSR loader: presentation locale from admin route + cookies. */
export async function fetchTaxonomyListOptionsForAdminRoute(
  cookie: Parameters<typeof adminApiClient>[0],
  request: Parameters<typeof adminApiClient>[1],
  paramsLang?: string,
): Promise<TaxonomyListOptions> {
  return fetchTaxonomyListOptionsWithClient(adminApiClient(cookie, request, paramsLang));
}
