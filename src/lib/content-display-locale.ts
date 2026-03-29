import type { BlogPost } from '../types/blog';
import type { Project } from '../types/project';
import type { SiteLanguageRow } from '../types/site-language';
import { parseTranslationsJson } from './content-translations';

/**
 * Effective primary locale for a record (matches backend SiteLanguages::primaryLocaleForContent).
 */
export function primaryLocaleForContent(
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocale: string | null | undefined,
): string {
  const list = Array.isArray(siteLanguages) && siteLanguages.length > 0 ? siteLanguages : [{ code: 'en', label: 'English', native_label: 'English', rtl: false }];
  const codes = new Set(list.map((l) => String(l.code).toLowerCase()));
  const raw =
    contentLocale != null && String(contentLocale).trim() !== '' ? String(contentLocale).trim().toLowerCase() : '';
  const def = (siteDefaultLocale || 'en').toLowerCase();
  return raw && codes.has(raw) ? raw : def;
}

/** Fields to show in main form inputs for the current dashboard language. */
export function mergeBlogPostFieldsForUiLocale(
  post: BlogPost,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { title: string; excerpt: string; content: string } {
  const primary = primaryLocaleForContent(siteLanguages, siteDefaultLocale, contentLocaleOverride ?? post.content_locale ?? null);
  const u = uiLocale.toLowerCase();
  if (u === primary) {
    return {
      title: post.title ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
    };
  }
  const row = post.translations?.find((t) => String(t.locale).toLowerCase() === u);
  return {
    title: row?.title != null && row.title !== '' ? row.title : post.title ?? '',
    excerpt: row?.excerpt != null && row.excerpt !== '' ? row.excerpt : post.excerpt ?? '',
    content: row?.content != null && row.content !== '' ? row.content : post.content ?? '',
  };
}

export function mergeProjectFieldsForUiLocale(
  project: Project,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { title: string; summary: string; description: string } {
  const primary = primaryLocaleForContent(siteLanguages, siteDefaultLocale, contentLocaleOverride ?? project.content_locale ?? null);
  const u = uiLocale.toLowerCase();
  if (u === primary) {
    return {
      title: project.title ?? '',
      summary: project.summary ?? '',
      description: project.description ?? '',
    };
  }
  const row = project.translations?.find((t) => String(t.locale).toLowerCase() === u);
  return {
    title: row?.title != null && row.title !== '' ? row.title : project.title ?? '',
    summary: row?.summary != null && row.summary !== '' ? row.summary : project.summary ?? '',
    description: row?.description != null && row.description !== '' ? row.description : project.description ?? '',
  };
}

/**
 * Merge main-field edits for a secondary UI locale into translations_json rows (blog).
 */
export function mergeSecondaryBlogTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; excerpt: string; content: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title, excerpt: edited.excerpt, content: edited.content };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

/**
 * Merge main-field edits for a secondary UI locale into translations_json rows (project).
 */
export function mergeSecondaryProjectTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; summary: string; description: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title, summary: edited.summary, description: edited.description };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}
