import { routeLoader$ } from '@builder.io/qwik-city';
import { isServer } from '@builder.io/qwik/build';
import { getApiClient, extractCookieHeader } from '../api/client';
import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';

export interface SiteLanguageConfig {
  site_languages: SiteLanguageRow[];
  default_locale: string;
  secondary: SiteLanguageRow[];
}

/** Agent debug: cap logs per process */
let __agentLangCfgLogs = 0;

/**
 * Loads site language list and default locale for admin content forms.
 * Uses GET /public/site-meta (no auth). Authenticated GET /settings fails from SSR/routeLoader$
 * when Sanctum cookies or Bearer tokens are not available — previously caused 401 and English-only fallback.
 */
export const useSiteLanguageConfig = routeLoader$(async ({ cookie, request }): Promise<SiteLanguageConfig> => {
  const cookieHeader = extractCookieHeader(cookie, request);

  try {
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

    // #region agent log
    if (__agentLangCfgLogs < 40) {
      __agentLangCfgLogs += 1;
      fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '08cfc0',
        },
        body: JSON.stringify({
          sessionId: '08cfc0',
          runId: 'post-fix-site-meta',
          hypothesisId: 'H5',
          location: 'site-language-config.ts:success',
          message: 'useSiteLanguageConfig loaded from public site-meta',
          data: {
            langCount: site_languages.length,
            default_locale,
            cookiePresent: Boolean(cookieHeader?.length),
            isServer,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

    return {
      site_languages,
      default_locale,
      secondary: secondaryLocales(site_languages, default_locale),
    };
  } catch (e) {
    console.warn('useSiteLanguageConfig: falling back to English only', e);

    // #region agent log
    if (__agentLangCfgLogs < 40) {
      __agentLangCfgLogs += 1;
      fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '08cfc0',
        },
        body: JSON.stringify({
          sessionId: '08cfc0',
          runId: 'post-fix-site-meta',
          hypothesisId: 'H-fail',
          location: 'site-language-config.ts:catch',
          message: 'useSiteLanguageConfig site-meta fetch failed',
          data: {
            err: e instanceof Error ? e.message : String(e),
            cookiePresent: Boolean(cookieHeader?.length),
            isServer,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

    return {
      site_languages: [{ code: 'en', label: 'English', native_label: 'English', rtl: false }],
      default_locale: 'en',
      secondary: [],
    };
  }
});
