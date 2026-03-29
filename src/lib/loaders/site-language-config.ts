import { routeLoader$ } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';

export interface SiteLanguageConfig {
  site_languages: SiteLanguageRow[];
  default_locale: string;
  secondary: SiteLanguageRow[];
}

/**
 * Loads site language list and default locale for admin content forms.
 */
export const useSiteLanguageConfig = routeLoader$(async ({ cookie, request }): Promise<SiteLanguageConfig> => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<Record<string, unknown>>(API_ENDPOINTS.SETTINGS.GET);
    const settings = (response?.data ?? response) as Record<string, unknown>;
    const site_languages = Array.isArray(settings.site_languages)
      ? (settings.site_languages as SiteLanguageRow[])
      : [];
    const default_locale =
      typeof settings.default_locale === 'string' && settings.default_locale
        ? settings.default_locale.toLowerCase()
        : 'en';
    return {
      site_languages,
      default_locale,
      secondary: secondaryLocales(site_languages, default_locale),
    };
  } catch (e) {
    console.warn('useSiteLanguageConfig: falling back to English only', e);
    return {
      site_languages: [{ code: 'en', label: 'English', native_label: 'English', rtl: false }],
      default_locale: 'en',
      secondary: [],
    };
  }
});
