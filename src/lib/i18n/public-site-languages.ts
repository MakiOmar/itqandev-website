import { speakConfig } from './config';
import { isUiLocaleRtl } from './ui-locale-segments';
import type { SiteLanguageRow } from '../../types/site-language';

const SPEAK_UI_LABELS: Record<string, { label: string; native_label: string }> = {
  en: { label: 'English', native_label: 'English' },
  ar: { label: 'Arabic', native_label: 'العربية' },
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
    };
    return {
      code,
      label: meta.label,
      native_label: meta.native_label,
      rtl: isUiLocaleRtl(code),
    };
  });
}

const supportedSpeakCodes = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

function normalizeConfiguredSiteLanguages(raw: unknown): SiteLanguageRow[] {
  return (Array.isArray(raw) ? raw : [])
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
}

/**
 * Normalize API `site_languages` for content locale resolution and shell branding.
 * When the API is unreachable (common on SSR) or returns nothing, fall back to qwik-speak locales.
 */
export function resolvePublicSiteLanguages(raw: unknown): SiteLanguageRow[] {
  const fromApi = normalizeConfiguredSiteLanguages(raw);

  if (fromApi.length >= 2) {
    return fromApi;
  }

  // Site intentionally configured with a single content language.
  if (fromApi.length === 1) {
    return fromApi;
  }

  return speakUiLanguageRows();
}

/**
 * Options for the public header UI language switcher.
 * Content may be single-locale (backend default is English-only) while qwik-speak still
 * ships EN/AR UI bundles — keep the switcher visible whenever multiple UI locales exist.
 */
export function publicHeaderLanguageOptions(raw: unknown): SiteLanguageRow[] {
  const configured = normalizeConfiguredSiteLanguages(raw);
  const speakRows = speakUiLanguageRows();

  if (configured.length >= 2) {
    return configured;
  }

  if (speakRows.length >= 2) {
    return speakRows;
  }

  return configured.length > 0 ? configured : speakRows;
}
