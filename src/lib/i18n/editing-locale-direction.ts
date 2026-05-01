import type { SiteLanguageRow } from '../../types/site-language';

/**
 * Text direction for the selected content-editing locale (from site languages RTL flag).
 */
export function directionForSiteLocale(
  siteLanguages: SiteLanguageRow[] | undefined | null,
  localeCode: string | undefined | null,
): 'rtl' | 'ltr' {
  const raw = localeCode != null ? String(localeCode).trim().toLowerCase() : '';
  if (!raw) {
    return 'ltr';
  }
  const list = Array.isArray(siteLanguages) ? siteLanguages : [];
  const row = list.find((l) => String(l.code).toLowerCase() === raw);
  return row?.rtl ? 'rtl' : 'ltr';
}

/** BCP 47-ish lang attribute for the editing locale when non-empty */
export function langAttributeForLocale(localeCode: string | undefined | null): string | undefined {
  const x = localeCode != null ? String(localeCode).trim() : '';
  return x !== '' ? x : undefined;
}
