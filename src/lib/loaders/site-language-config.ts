import { routeLoader$ } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { readPreferredLocaleFromCookieHeader } from '../i18n/dashboard-locale';

export interface SiteLanguageConfig {
  site_languages: SiteLanguageRow[];
  default_locale: string;
  secondary: SiteLanguageRow[];
  /**
   * Initial “editing / translation” tab: matches navbar `SiteLanguageSwitcher` (`preferred-locale` cookie)
   * when that code is configured on the site; otherwise `default_locale`.
   */
  content_editing_locale: string;
}

function pickContentEditingLocale(
  siteLanguages: SiteLanguageRow[],
  defaultLocale: string,
  cookieHeader: string | null,
): string {
  const preferred = readPreferredLocaleFromCookieHeader(cookieHeader)?.toLowerCase().trim();
  const codes = new Set(siteLanguages.map((l) => String(l?.code ?? '').toLowerCase()).filter(Boolean));
  if (preferred && codes.has(preferred)) {
    return preferred;
  }
  return defaultLocale;
}

/**
 * Loads site language list and default locale for admin content forms.
 * Uses GET /public/site-meta (no auth). Authenticated GET /settings fails from SSR/routeLoader$
 * when Sanctum cookies or Bearer tokens are not available — previously caused 401 and English-only fallback.
 */
export const useSiteLanguageConfig = routeLoader$(async ({ cookie, request }): Promise<SiteLanguageConfig> => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta);
    const settings = (response?.data ?? response) as Record<string, unknown>;
    const site_languages = Array.isArray(settings.site_languages)
      ? (settings.site_languages as SiteLanguageRow[])
      : [];
    const default_locale =
      typeof settings.default_locale === 'string' && settings.default_locale
        ? settings.default_locale.toLowerCase()
        : 'en';
    const content_editing_locale = pickContentEditingLocale(site_languages, default_locale, cookieHeader);
    return {
      site_languages,
      default_locale,
      secondary: secondaryLocales(site_languages, default_locale),
      content_editing_locale,
    };
  } catch (e) {
    console.warn('useSiteLanguageConfig: falling back to English only', e);
    return {
      site_languages: [{ code: 'en', label: 'English', native_label: 'English', rtl: false }],
      default_locale: 'en',
      secondary: [],
      content_editing_locale: 'en',
    };
  }
});
