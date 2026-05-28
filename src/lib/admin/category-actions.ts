import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Category } from '../../types';
import { parseTranslationsJson } from '../content-translations';
import {
  mergeSecondaryCategoryTranslations,
  shouldWritePrimaryColumns,
} from '../content-display-locale';

function formatCategoryApiError(err: unknown): string {
  const e = err as { message?: string; status?: number; errors?: Record<string, string[] | string> };
  const base = String(e?.message ?? 'Request failed');
  if (e?.status === 422 && e.errors && typeof e.errors === 'object') {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(e.errors)) {
      if (Array.isArray(v)) {
        for (const m of v) {
          lines.push(`${k}: ${m}`);
        }
      } else if (v != null) {
        lines.push(`${k}: ${String(v)}`);
      }
    }
    if (lines.length > 0) {
      return `${base} — ${lines.slice(0, 8).join('; ')}`.slice(0, 800);
    }
  }
  return base.slice(0, 600);
}

export function mapCategoryFromApi(raw: Record<string, unknown>): Category {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    content_locale: (raw.content_locale as string | null | undefined) ?? null,
    description: raw.description != null ? String(raw.description) : undefined,
    isFeatured: Boolean(raw.is_featured ?? raw.isFeatured),
    translations: Array.isArray(raw.translations) ? (raw.translations as Category['translations']) : [],
    projectsCount: (raw.projects_count ?? raw.projectsCount) as number | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
    seoMetas: Array.isArray(raw.seoMetas)
      ? (raw.seoMetas as Category['seoMetas'])
      : Array.isArray(raw.seo_metas)
        ? (raw.seo_metas as Category['seoMetas'])
        : undefined,
  };
}

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
  const slug = data.slug != null ? String(data.slug).trim() : '';
  if (slug !== '') body.slug = slug;
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

type CategoryPostClient = { post: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

export type RunCategoryCreateResult =
  | { ok: true; value: { success: true; category: Category } }
  | { ok: false; status: number; message: string };

async function runCategoryCreateWithApiClient(
  data: Record<string, unknown>,
  apiClient: CategoryPostClient,
): Promise<RunCategoryCreateResult> {
  try {
    const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
    const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

    const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
    const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
    const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
    const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
    const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
    const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

    let name = String(data.name || '');
    let description =
      data.description !== undefined && data.description !== null ? String(data.description) : undefined;
    let translationsOut: unknown[] | undefined;

    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      if (parsedTranslations) {
        translationsOut = parsedTranslations;
      }
    } else {
      if (!canonicalName.trim()) {
        return {
          ok: false,
          status: 422,
          message:
            'Enter the category name in the primary content language first, then add translations.',
        };
      }
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
      slug: (data.slug as string | undefined) || undefined,
      description,
      isFeatured: toBool((data as { is_featured?: unknown }).is_featured),
      content_locale: contentLocale,
      translations: translationsOut,
    });

    const response = await apiClient.post<Category>(API_ENDPOINTS.CATEGORIES.CREATE, apiBody);
    const raw = (response as { data?: Record<string, unknown> })?.data ?? (response as Record<string, unknown>);
    const created = mapCategoryFromApi(raw && typeof raw === 'object' ? raw : {});

    if (created.id == null || Number.isNaN(created.id)) {
      return { ok: false, status: 500, message: 'Create succeeded but no category id was returned.' };
    }

    return { ok: true, value: { success: true as const, category: created } };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number } };
    const st = e?.status === 401 || e?.response?.status === 401 ? 401 : e?.status === 422 || e?.response?.status === 422 ? 422 : 500;
    return { ok: false, status: st, message: formatCategoryApiError(err) || 'Failed to create category' };
  }
}

/** Browser create — avoids `routeAction$.submit` returning undefined while HTTP succeeds. */
export async function runCategoryCreateFromBrowser(
  fields: Record<string, unknown>,
): Promise<RunCategoryCreateResult> {
  const parsed = categorySchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runCategoryCreateWithApiClient(
    parsed.data as unknown as Record<string, unknown>,
    getApiClient(null) as CategoryPostClient,
  );
}

/**
 * Create category action (server-side, authenticated via forwarded cookies)
 */
export const useCreateCategory = routeAction$(async (data, { cookie, request, fail }) => {
  const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
  const r = await runCategoryCreateWithApiClient(data as unknown as Record<string, unknown>, apiClient as CategoryPostClient);
  if (!r.ok) {
    return fail(r.status, { message: r.message });
  }
  return r.value;
}, zod$(categorySchema));

const updateCategorySchema = categorySchema.extend({ id: z.string() });

export type RunCategoryUpdateResult =
  | { ok: true; value: { success: true; category: Category } }
  | { ok: false; status: number; message: string };

type CategoryPutClient = { put: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

async function runCategoryUpdateWithApiClient(
  data: Record<string, unknown>,
  apiClient: CategoryPutClient,
): Promise<RunCategoryUpdateResult> {
  try {
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
      slug: (data.slug as string | undefined) || undefined,
      description,
      isFeatured: toBool((data as { is_featured?: unknown }).is_featured),
      content_locale: contentLocale,
      translations: translationsOut,
    });

    const response = await apiClient.put<Category>(API_ENDPOINTS.CATEGORIES.UPDATE(String(data.id)), apiBody);
    const updated = (response as { data?: Category })?.data ?? response;
    return { ok: true, value: { success: true as const, category: updated as Category } };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number } };
    const st =
      e?.status === 401 || e?.response?.status === 401
        ? 401
        : e?.status === 422 || e?.response?.status === 422
          ? 422
          : 500;
    return { ok: false, status: st, message: formatCategoryApiError(err) || 'Failed to update category' };
  }
}

/** Browser save — same rationale as `runServiceUpdateFromBrowser`. */
export async function runCategoryUpdateFromBrowser(fields: Record<string, unknown>): Promise<RunCategoryUpdateResult> {
  const parsed = updateCategorySchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runCategoryUpdateWithApiClient(
    parsed.data as unknown as Record<string, unknown>,
    getApiClient(null) as CategoryPutClient,
  );
}

/**
 * Update category action (server-side, authenticated via forwarded cookies)
 */
export const useUpdateCategory = routeAction$(async (data, { cookie, request, fail }) => {
  const apiClient = getApiClient(extractCookieHeader(cookie, request as any));
  const r = await runCategoryUpdateWithApiClient(data as unknown as Record<string, unknown>, apiClient as CategoryPutClient);
  if (!r.ok) {
    return fail(r.status, { message: r.message });
  }
  return r.value;
}, zod$(updateCategorySchema));

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
