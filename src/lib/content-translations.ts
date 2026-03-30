import type { BlogTranslationRow, CategoryTranslationRow, ProjectTranslationRow, SiteLanguageRow } from '../types/site-language';

const defaultEnglish: SiteLanguageRow = {
  code: 'en',
  label: 'English',
  native_label: 'English',
  rtl: false,
};

/** Locales that may have translation rows (excludes default / primary locale). */
export function secondaryLocales(
  all: SiteLanguageRow[] | undefined | null,
  defaultLocale: string | undefined | null,
): SiteLanguageRow[] {
  const def = (defaultLocale || 'en').toLowerCase();
  const list = Array.isArray(all) && all.length > 0 ? all : [defaultEnglish];
  return list.filter((l) => l.code.toLowerCase() !== def);
}

/**
 * Secondary locales for a record whose main columns use `contentLocale` (or site default when empty).
 */
export function secondaryLocalesForContent(
  all: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocale: string | null | undefined,
): SiteLanguageRow[] {
  const list = Array.isArray(all) && all.length > 0 ? all : [defaultEnglish];
  const codes = new Set(list.map((l) => l.code.toLowerCase()));
  const raw =
    contentLocale != null && String(contentLocale).trim() !== '' ? String(contentLocale).trim().toLowerCase() : '';
  const primary = raw && codes.has(raw) ? raw : (siteDefaultLocale || 'en').toLowerCase();
  return list.filter((l) => l.code.toLowerCase() !== primary);
}

/** Build JSON for hidden `translations_json` from the in-memory store. */
export function serializeTranslationsJson(
  kind: 'project' | 'blog' | 'category',
  locales: SiteLanguageRow[],
  store: Record<string, Record<string, string>>,
): string {
  const arr = locales.map((l) => {
    const r = store[l.code] || {};
    if (kind === 'project') {
      return {
        locale: l.code,
        title: r.title ?? '',
        summary: r.summary ?? '',
        description: r.description ?? '',
      };
    }
    if (kind === 'blog') {
      return {
        locale: l.code,
        title: r.title ?? '',
        excerpt: r.excerpt ?? '',
        content: r.content ?? '',
      };
    }
    return {
      locale: l.code,
      name: r.name ?? '',
      description: r.description ?? '',
    };
  });
  return JSON.stringify(arr);
}

export function translationRowsFromJsonString(s: string): Map<string, Record<string, string>> {
  const m = new Map<string, Record<string, string>>();
  try {
    const arr = JSON.parse(s) as unknown;
    if (!Array.isArray(arr)) {
      return m;
    }
    for (const item of arr) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const row = item as Record<string, unknown>;
      const loc = String(row.locale ?? '')
        .trim()
        .toLowerCase();
      if (!loc) {
        continue;
      }
      m.set(loc, row as Record<string, string>);
    }
  } catch {
    return m;
  }
  return m;
}

/** JSON for hidden `translations_json` field (one row per secondary locale). */
export function initialTranslationsJson(
  kind: 'project' | 'blog' | 'category',
  locales: SiteLanguageRow[],
  fromApi?: ProjectTranslationRow[] | BlogTranslationRow[] | CategoryTranslationRow[] | null,
): string {
  const arr = locales.map((l) => {
    const row = fromApi?.find((x) => String(x.locale).toLowerCase() === l.code.toLowerCase());
    if (kind === 'project') {
      const p = row as ProjectTranslationRow | undefined;
      return {
        locale: l.code,
        title: p?.title ?? '',
        summary: p?.summary ?? '',
        description: p?.description ?? '',
      };
    }
    if (kind === 'blog') {
      const b = row as BlogTranslationRow | undefined;
      return {
        locale: l.code,
        title: b?.title ?? '',
        excerpt: b?.excerpt ?? '',
        content: b?.content ?? '',
      };
    }
    const c = row as CategoryTranslationRow | undefined;
    return {
      locale: l.code,
      name: c?.name ?? '',
      description: c?.description ?? '',
    };
  });
  return JSON.stringify(arr);
}

export function parseTranslationsJson(raw: unknown): unknown[] | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  const s = typeof raw === 'string' ? raw : String(raw);
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
