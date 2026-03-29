import type { BlogTranslationRow, ProjectTranslationRow, SiteLanguageRow } from '../types/site-language';

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

/** JSON for hidden `translations_json` field (one row per secondary locale). */
export function initialTranslationsJson(
  kind: 'project' | 'blog',
  locales: SiteLanguageRow[],
  fromApi?: ProjectTranslationRow[] | BlogTranslationRow[] | null,
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
    const b = row as BlogTranslationRow | undefined;
    return {
      locale: l.code,
      title: b?.title ?? '',
      excerpt: b?.excerpt ?? '',
      content: b?.content ?? '',
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
