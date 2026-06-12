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

export function scalarTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  field: SettingsScalarField,
): string {
  const row = map[locale.toLowerCase()];
  const val = row?.[field];
  return typeof val === 'string' ? val : '';
}

export function setScalarTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  field: SettingsScalarField,
  value: string,
): SettingsTranslationsMap {
  const code = locale.toLowerCase();
  const next = { ...map };
  next[code] = { ...(next[code] ?? {}), [field]: value };
  return next;
}

export function secondarySiteLocales(
  all: SiteLanguageRow[] | undefined,
  defaultLocale: string | undefined,
): SiteLanguageRow[] {
  return secondaryLocales(all, defaultLocale);
}

/** Read a nested marketing_site_content string from a locale translation row. */
export function marketingTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  path: string[],
): string {
  const row = map[locale.toLowerCase()];
  const marketing = row?.marketing_site_content;
  if (!marketing || typeof marketing !== 'object' || Array.isArray(marketing)) {
    return '';
  }
  let cur: unknown = marketing;
  for (const key of path) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
      return '';
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : '';
}

/** Set a nested marketing_site_content string on a locale translation row. */
export function setMarketingTranslation(
  map: SettingsTranslationsMap,
  locale: string,
  path: string[],
  value: string,
): SettingsTranslationsMap {
  const code = locale.toLowerCase();
  const next = { ...map };
  const row = { ...(next[code] ?? {}) };
  const marketing =
    row.marketing_site_content && typeof row.marketing_site_content === 'object' && !Array.isArray(row.marketing_site_content)
      ? { ...(row.marketing_site_content as Record<string, unknown>) }
      : {};

  let cur: Record<string, unknown> = marketing;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const child = cur[key];
    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  const leaf = path[path.length - 1];
  if (leaf) {
    cur[leaf] = value;
  }

  row.marketing_site_content = marketing;
  next[code] = row;
  return next;
}
