import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Category } from '../../types';
import { parseTranslationsJson } from '../content-translations';
import {
  mergeSecondaryCategoryTranslations,
  shouldWritePrimaryColumns,
} from '../content-display-locale';

/** Laravel expects snake_case JSON keys (no global camelCase middleware). */
function categoryPayloadForApi(data: {
  name?: string;
  slug?: string;
  description?: string;
  isFeatured?: boolean;
  content_locale?: string | null;
  translations?: unknown[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.slug !== undefined) body.slug = data.slug;
  if (data.description !== undefined) body.description = data.description;
  if (data.isFeatured !== undefined) body.is_featured = data.isFeatured;
  if (data.content_locale !== undefined) body.content_locale = data.content_locale;
  if (data.translations !== undefined && Array.isArray(data.translations)) {
    body.translations = data.translations;
  }
  return body;
}

/**
 * Category schema (used by Qwik City action validation)
 * Note: action data comes as strings from forms, so is_featured can be "1"/"on"/"true".
 */
/** Same pattern as skills/services: Zod strips undeclared keys (translations_json etc.). */
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  is_featured: z.union([z.boolean(), z.string()]).optional(),
  content_locale: z.string().optional(),
  editing_locale: z.string().optional(),
  form_site_default_locale: z.string().optional(),
  effective_primary_locale: z.string().optional(),
  canonical_name: z.string().optional(),
  canonical_description: z.string().optional(),
  translations_json: z.string().optional(),
}).passthrough();

const toBool = (v: unknown) => v === true || v === '1' || v === 'on' || v === 'true';

/**
 * Create category action (server-side, authenticated via forwarded cookies)
 */
export const useCreateCategory = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader);

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

      let name = String(data.name || '');
      let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
      let translationsOut: unknown[] | undefined;

      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          translationsOut = parsedTranslations;
        }
      } else {
        name = canonicalName;
        description = canonicalDescription;
        translationsOut = mergeSecondaryCategoryTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          { name: String(data.name || ''), description: String(data.description ?? '') },
        );
      }

      const apiBody = categoryPayloadForApi({
        name,
        slug: data.slug || undefined,
        description,
        isFeatured: toBool((data as any).is_featured),
        content_locale: contentLocale,
        translations: translationsOut,
      });

      const response = await apiClient.post<Category>(API_ENDPOINTS.CATEGORIES.CREATE, apiBody);
      const created = (response as any)?.data ?? response;

      return { success: true, category: created as Category };
    } catch (err: any) {
      return fail(500, { message: err?.message || 'Failed to create category' });
    }
  },
  zod$(categorySchema),
);

/**
 * Update category action (server-side, authenticated via forwarded cookies)
 */
export const useUpdateCategory = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader);

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

      let name = String(data.name || '');
      let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
      let translationsOut: unknown[] | undefined;

      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        // Same as services update: do not PATCH translation rows from placeholder-only translations_json.
        translationsOut = undefined;
      } else {
        name = canonicalName;
        description = canonicalDescription;
        translationsOut = mergeSecondaryCategoryTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          { name: String(data.name || ''), description: String(data.description ?? '') },
        );
      }

      const apiBody = categoryPayloadForApi({
        name,
        slug: data.slug || undefined,
        description,
        isFeatured: toBool((data as any).is_featured),
        content_locale: contentLocale,
        translations: translationsOut,
      });

      const response = await apiClient.put<Category>(
        API_ENDPOINTS.CATEGORIES.UPDATE(String((data as any).id)),
        apiBody,
      );

      const updated = (response as any)?.data ?? response;
      return { success: true, category: updated as Category };
    } catch (err: any) {
      return fail(401, { message: err?.message || 'Unauthorized' });
    }
  },
  zod$(categorySchema.extend({ id: z.string() })),
);

/**
 * Delete category action (server-side, authenticated via forwarded cookies)
 */
export const useDeleteCategory = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);

    await apiClient.delete(API_ENDPOINTS.CATEGORIES.DELETE((data as any).id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete category' });
  }
});

/**
 * Bulk delete categories action (server-side, authenticated via forwarded cookies)
 */
export const useBulkDeleteCategories = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);

    const idsRaw = (data as any).ids;
    const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : [];

    await apiClient.post(API_ENDPOINTS.CATEGORIES.BULK_DELETE, { ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete categories' });
  }
});
