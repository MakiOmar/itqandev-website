import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { parseTranslationsJson } from '../content-translations';
import { shouldWritePrimaryColumns } from '../content-display-locale';

function formatBlogApiError(err: unknown): string {
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

function mergeSecondaryBlogTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; excerpt: string; content?: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') return false;
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row: Record<string, string> = {
    locale: u,
    title: edited.title,
    excerpt: edited.excerpt,
  };
  if (edited.content !== undefined) {
    row.content = edited.content;
  }
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

/**
 * Only the fullscreen builder writes layout. Classic metadata saves must omit
 * `sections` so they cannot wipe builder content with [].
 */
export function buildBlogPostBody(data: Record<string, unknown>): Record<string, unknown> {
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
    translationsOut = mergeSecondaryBlogTranslations(data.translations_json as string | undefined, editingLocale, {
      title: String(data.title || ''),
      excerpt: data.excerpt != null ? String(data.excerpt) : '',
      content: data.content != null ? String(data.content) : undefined,
    });
  }

  const body: Record<string, unknown> = {
    title,
    slug: String(data.slug || ''),
    excerpt,
  };

  if (data.status !== undefined) {
    const status = String(data.status);
    body.status = status === 'published' || status === 'archived' ? status : 'draft';
  }

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
  if (data.featured !== undefined) {
    body.featured =
      data.featured === true || data.featured === 'true' || data.featured === '1' || data.featured === 1;
  }
  if (data.published_at !== undefined) {
    const raw = data.published_at;
    body.published_at = raw === null || raw === '' || raw === undefined ? null : String(raw);
  }

  return body;
}

export async function runBlogPostUpdateFromBrowser(
  id: number | string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const api = getApiClient(null);
    await api.put(API_ENDPOINTS.BLOG.UPDATE(id), buildBlogPostBody(data));
    return { success: true, message: 'Blog post saved.' };
  } catch (err) {
    return { success: false, error: formatBlogApiError(err) };
  }
}
