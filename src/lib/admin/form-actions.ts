import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { parseTranslationsJson } from '../content-translations';
import { shouldWritePrimaryColumns } from '../content-display-locale';

function formatFormApiError(err: unknown): string {
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

function parseJsonObject(raw: string | undefined | null, fallback: unknown): unknown {
  if (raw == null || String(raw).trim() === '') return fallback;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

export function mergeSecondaryFormTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') return false;
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

export const formFormSchema = z
  .object({
    title: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    status: z.enum(['draft', 'published']).optional(),
    content_locale: z.string().max(16).optional(),
    editing_locale: z.string().max(16).optional(),
    effective_primary_locale: z.string().max(16).optional(),
    canonical_title: z.string().optional(),
    layout_json: z.string().optional(),
    actions_json: z.string().optional(),
    settings_json: z.string().optional(),
    translations_json: z.string().optional(),
  })
  .passthrough();

function buildFormBody(data: Record<string, unknown>): Record<string, unknown> {
  const effectivePrimary = String(data.effective_primary_locale || data.content_locale || 'en');
  const editingLocale = String(data.editing_locale || effectivePrimary);
  const layout = parseJsonObject(data.layout_json as string | undefined, { rows: [] });
  const actions = parseJsonObject(data.actions_json as string | undefined, []);
  const settings = parseJsonObject(data.settings_json as string | undefined, {});
  const parsedTranslations = parseTranslationsJson(data.translations_json as string | undefined);

  let title = String(data.title || '');
  let translationsOut: unknown[] | undefined;

  if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
    if (parsedTranslations) translationsOut = parsedTranslations;
  } else {
    title = String(data.canonical_title ?? title);
    translationsOut = mergeSecondaryFormTranslations(
      data.translations_json as string | undefined,
      editingLocale,
      { title: String(data.title || '') },
    );
  }

  const body: Record<string, unknown> = {
    title,
    slug: String(data.slug || ''),
    status: data.status === 'published' ? 'published' : 'draft',
    layout,
    actions,
    settings,
  };
  if (data.content_locale !== undefined) {
    const raw = String(data.content_locale || '').trim();
    body.content_locale = raw || null;
  }
  if (translationsOut) {
    body.translations = translationsOut;
  }
  return body;
}

export async function runFormCreateFromBrowser(
  data: Record<string, unknown>,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const api = getApiClient(null);
    const body = buildFormBody(data);
    if (!String(body.slug || '').trim()) {
      return { success: false, error: 'Slug is required' };
    }
    const res = await api.post<{ id?: number }>(API_ENDPOINTS.FORMS.CREATE, body);
    const id = (res as { data?: { id?: number } })?.data?.id ?? (res as { id?: number })?.id;
    if (id == null || !Number.isFinite(Number(id))) {
      return { success: false, error: 'Form created but no id returned' };
    }
    return { success: true, id: Number(id) };
  } catch (err) {
    return { success: false, error: formatFormApiError(err) };
  }
}

export async function runFormUpdateFromBrowser(
  id: number | string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const api = getApiClient(null);
    await api.put(API_ENDPOINTS.FORMS.UPDATE(id), buildFormBody(data));
    return { success: true, message: 'Form saved.' };
  } catch (err) {
    return { success: false, error: formatFormApiError(err) };
  }
}

export const useDeleteForm = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const api = getApiClient(extractCookieHeader(cookie, request));
      await api.delete(API_ENDPOINTS.FORMS.DELETE(data.id));
      return { success: true as const };
    } catch (err) {
      return fail(400, { message: formatFormApiError(err) });
    }
  },
  zod$({ id: z.coerce.number().int().positive() }),
);

export const useBulkDeleteForms = routeAction$(
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
      await api.post(API_ENDPOINTS.FORMS.BULK_DELETE, { ids });
      return { success: true as const };
    } catch (err) {
      return fail(400, { message: formatFormApiError(err) });
    }
  },
  zod$({ ids: z.string().min(1) }),
);
