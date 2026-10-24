import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';

export type SettingsScalarField = 'site_name' | 'site_description' | 'site_address';

export type SettingsTranslationsMap = Record<string, Record<string, unknown>>;

export function parseSettingsTranslations(raw: unknown): SettingsTranslationsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: SettingsTranslationsMap = {};
  for (const [code, row] of Object.entries(raw as Record<string, unknown>)) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      out[String(code).toLowerCase()] = row as Record<string, unknown>;
    }
  }
  return out;
}

export function serializeSettingsTranslations(map: SettingsTranslationsMap): string {
  return JSON.stringify(map);
}

export function secondarySiteLocales(
  all: SiteLanguageRow[] | undefined,
  defaultLocale: string | undefined,
): SiteLanguageRow[] {
  return secondaryLocales(all, defaultLocale);
}

/** Read a nested string (e.g. `['seo_defaults', 'meta_description']`) from a locale translation row. */
export function pathTranslation(map: SettingsTranslationsMap, locale: string, path: string[]): string {
  let cur: unknown = map[locale.toLowerCase()];
  for (const key of path) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
      return '';
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : '';
}

/** Set a nested string on a locale translation row, copying each object along the path. */
export function setPathTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  path: string[],
  value: string,
): SettingsTranslationsMap {
  const code = locale.toLowerCase();
  const next = { ...map };
  const row: Record<string, unknown> = { ...(next[code] ?? {}) };

  let cur: Record<string, unknown> = row;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const child = cur[key];
    cur[key] = child && typeof child === 'object' && !Array.isArray(child) ? { ...(child as Record<string, unknown>) } : {};
    cur = cur[key] as Record<string, unknown>;
  }
  const leaf = path[path.length - 1];
  if (leaf) {
    cur[leaf] = value;
  }

  next[code] = row;
  return next;
}

/** Read a nested marketing_site_content string from a locale translation row. */
export function marketingTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  path: string[],
): string {
  return pathTranslation(map, locale, ['marketing_site_content', ...path]);
}

/** Set a nested marketing_site_content string on a locale translation row. */
export function setMarketingTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  path: string[],
  value: string,
): SettingsTranslationsMap {
  return setPathTranslation(map, locale, ['marketing_site_content', ...path], value);
}
