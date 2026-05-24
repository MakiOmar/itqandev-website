import { speakConfig } from './config';
import type { SiteLanguageRow } from '../../types/site-language';

const SPEAK_UI_LABELS: Record<string, { label: string; native_label: string; rtl: boolean }> = {
  en: { label: 'English', native_label: 'English', rtl: false },
  ar: { label: 'Arabic', native_label: 'العربية', rtl: true },
};

/**
 * Locales that have qwik-speak UI bundles (en.json / ar.json).
 */
export function speakUiLanguageRows(): SiteLanguageRow[] {
  return speakConfig.supportedLocales.map((loc) => {
    const code = String(loc.lang).toLowerCase();
    const meta = SPEAK_UI_LABELS[code] ?? {
      label: code,
      native_label: code.toUpperCase(),
      rtl: code === 'ar',
    };
    return {
      code,
      label: meta.label,
      native_label: meta.native_label,
      rtl: meta.rtl,
    };
  });
}

const supportedSpeakCodes = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

/**
 * Normalize API `site_languages` for the public header switcher.
 * When the API is unreachable (common on SSR) or returns nothing, fall back to qwik-speak locales
 * so guests see the same EN/AR switcher as authenticated users on the dashboard.
 */
export function resolvePublicSiteLanguages(raw: unknown): SiteLanguageRow[] {
  const fromApi = (Array.isArray(raw) ? raw : [])
    .filter(
      (row): row is SiteLanguageRow =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as SiteLanguageRow).code === 'string' &&
        supportedSpeakCodes.has(String((row as SiteLanguageRow).code).toLowerCase()),
    )
    .map((row) => ({
      code: String(row.code).toLowerCase(),
      label: row.label ?? row.code,
      native_label: row.native_label ?? row.label ?? row.code,
      rtl: !!row.rtl,
    }));

  if (fromApi.length >= 2) {
    return fromApi;
  }

  // Site intentionally configured with a single language — do not invent a second locale.
  if (fromApi.length === 1) {
    return fromApi;
  }

  return speakUiLanguageRows();
}
