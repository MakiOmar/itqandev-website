import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { parseTranslationsJson } from '../content-translations';
import { shouldWritePrimaryColumns } from '../content-display-locale';

function formatPageApiError(err: unknown): string {
  const e = err as { message?: string; status?: number; errors?: Record<string, string[] | string> };
  const base = String(e?.message ?? 'Request failed');
  if (e?.status === 422 && e.errors && typeof e.errors === 'object') {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(e.errors)) {
      if (Array.isArray(v)) {
        for (const m of v) lines.push(`${k}: ${m}`);
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

function parseSectionsJson(raw: string | undefined | null): unknown[] {
  if (raw == null || String(raw).trim() === '') return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mergeSecondaryPageTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; excerpt: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') return false;
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title, excerpt: edited.excerpt };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

export const pageFormSchema = z
  .object({
    title: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    excerpt: z.string().max(512).optional(),
    status: z.enum(['draft', 'published']).optional(),
    content_locale: z.string().max(16).optional(),
    editing_locale: z.string().max(16).optional(),
    effective_primary_locale: z.string().max(16).optional(),
    canonical_title: z.string().optional(),
    canonical_excerpt: z.string().optional(),
    sections_json: z.string().optional(),
    translations_json: z.string().optional(),
    parent_id: z.union([z.coerce.number(), z.literal(''), z.null()]).optional(),
    exclude_from_search: z.union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0'), z.literal(1), z.literal(0)]).optional(),
  })
  .passthrough();

function buildPageBody(data: Record<string, unknown>): Record<string, unknown> {
  const effectivePrimary = String(data.effective_primary_locale || data.content_locale || 'en');
  const editingLocale = String(data.editing_locale || effectivePrimary);
  const parsedTranslations = parseTranslationsJson(data.translations_json as string | undefined);

  let title = String(data.title || '');
  let excerpt = data.excerpt != null ? String(data.excerpt) : '';
  let translationsOut: unknown[] | undefined;

  if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
    if (parsedTranslations) translationsOut = parsedTranslations;
  } else {
    title = String(data.canonical_title ?? title);
    excerpt = String(data.canonical_excerpt ?? excerpt);
    translationsOut = mergeSecondaryPageTranslations(data.translations_json as string | undefined, editingLocale, {
      title: String(data.title || ''),
      excerpt: data.excerpt != null ? String(data.excerpt) : '',
    });
  }

  const body: Record<string, unknown> = {
    title,
    slug: String(data.slug || ''),
    excerpt,
    status: data.status === 'published' ? 'published' : 'draft',
  };
  // Only the fullscreen builder writes layout. Classic metadata saves must omit
  // `sections` so they cannot wipe builder content with [].
  const persistSections =
    data.persist_sections === true ||
    data.persist_sections === 1 ||
    data.persist_sections === '1' ||
    data.persist_sections === 'true';
  if (persistSections) {
    body.sections = parseSectionsJson(data.sections_json as string | undefined);
  }
  if (data.content_locale !== undefined) {
    const raw = String(data.content_locale || '').trim();
    body.content_locale = raw || null;
  }
  if (translationsOut) {
    body.translations = translationsOut;
  }
  if (data.header_layout_id !== undefined) {
    const raw = data.header_layout_id;
    body.header_layout_id =
      raw === null || raw === '' || raw === undefined ? null : Number(raw);
  }
  if (data.footer_layout_id !== undefined) {
    const raw = data.footer_layout_id;
    body.footer_layout_id =
      raw === null || raw === '' || raw === undefined ? null : Number(raw);
  }
  if (data.parent_id !== undefined) {
    const raw = data.parent_id;
    body.parent_id = raw === null || raw === '' || raw === undefined ? null : Number(raw);
  }
  if (data.exclude_from_search !== undefined) {
    const raw = data.exclude_from_search;
    body.exclude_from_search =
      raw === true || raw === 'true' || raw === '1' || raw === 1;
  }
  return body;
}

export const useCreatePage = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const api = getApiClient(extractCookieHeader(cookie, request));
      const body = buildPageBody(data as Record<string, unknown>);
      const res = await api.post<{ id?: number }>(API_ENDPOINTS.PAGES.CREATE, body);
      const id = (res as { data?: { id?: number } })?.data?.id ?? (res as { id?: number })?.id;
      return { success: true as const, id };
    } catch (err) {
      return fail(400, { message: formatPageApiError(err) });
    }
  },
  zod$(pageFormSchema),
);

export async function runPageCreateFromBrowser(
  data: Record<string, unknown>,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const api = getApiClient(null);
    const body = buildPageBody(data);
    if (!String(body.slug || '').trim()) {
      return { success: false, error: 'Slug is required' };
    }
    const res = await api.post<{ id?: number }>(API_ENDPOINTS.PAGES.CREATE, body);
    const id = (res as { data?: { id?: number } })?.data?.id ?? (res as { id?: number })?.id;
    if (id == null || !Number.isFinite(Number(id))) {
      return { success: false, error: 'Page created but no id returned' };
    }
    return { success: true, id: Number(id) };
  } catch (err) {
    return { success: false, error: formatPageApiError(err) };
  }
}

export async function runPageUpdateFromBrowser(
  id: number | string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const api = getApiClient(null);
    await api.put(API_ENDPOINTS.PAGES.UPDATE(id), buildPageBody(data));
    return { success: true, message: 'Page saved.' };
  } catch (err) {
    return { success: false, error: formatPageApiError(err) };
  }
}

export const useDeletePage = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const api = getApiClient(extractCookieHeader(cookie, request));
      await api.delete(API_ENDPOINTS.PAGES.DELETE(data.id));
      return { success: true as const };
    } catch (err) {
      return fail(400, { message: formatPageApiError(err) });
    }
  },
  zod$({ id: z.coerce.number().int().positive() }),
);

export async function runPageDeleteFromBrowser(
  id: number | string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const api = getApiClient(null);
    await api.delete(API_ENDPOINTS.PAGES.DELETE(id));
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatPageApiError(err) };
  }
}

export const useBulkDeletePages = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const ids = String(data.ids || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length === 0) {
        return fail(422, { message: 'No ids' });
      }
      const api = getApiClient(extractCookieHeader(cookie, request));
      await api.post(API_ENDPOINTS.PAGES.BULK_DELETE, { ids });
      return { success: true as const };
    } catch (err) {
      return fail(400, { message: formatPageApiError(err) });
    }
  },
  zod$({ ids: z.string().min(1) }),
);

export async function runPageBulkDeleteFromBrowser(
  ids: Array<number | string>,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const normalized = ids
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (normalized.length === 0) {
      return { ok: false, message: 'No ids' };
    }
    const api = getApiClient(null);
    await api.post(API_ENDPOINTS.PAGES.BULK_DELETE, { ids: normalized });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatPageApiError(err) };
  }
}

