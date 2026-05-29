import { routeLoader$ } from '@builder.io/qwik-city';
import { extractCookieHeader } from '../api/client';
import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { marketingGet } from '../marketing/api-client';
import { shouldSkipSsrMarketingApi, isDevSsrMarketingFetchFailure } from '../marketing/ssr-api-reachability';
import { readPreferredLocaleFromCookieHeader } from '../i18n/dashboard-locale';
import { resolvePublicSiteLanguages } from '../i18n/public-site-languages';

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
function siteLanguageFallback(cookieHeader: string | null): SiteLanguageConfig {
  const site_languages = resolvePublicSiteLanguages(null);
  const default_locale = 'en';
  return {
    site_languages,
    default_locale,
    secondary: secondaryLocales(site_languages, default_locale),
    content_editing_locale: pickContentEditingLocale(site_languages, default_locale, cookieHeader),
  };
}

export const useSiteLanguageConfig = routeLoader$(async ({ cookie, request }): Promise<SiteLanguageConfig> => {
  const cookieHeader = extractCookieHeader(cookie, request);
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return siteLanguageFallback(cookieHeader);
  }
  try {
    const settings = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta, null, {
      forwardCookies: cookieHeader,
      forwardDocumentUrl: request.url,
    });
    const site_languages = resolvePublicSiteLanguages(settings?.site_languages);
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
    const isDevSkip = isDevSsrMarketingFetchFailure(e);
    if (import.meta.env.DEV && !isDevSkip) {
      console.warn(
        'useSiteLanguageConfig: site-meta request failed; using qwik-speak locale fallback. ' +
          'Set VITE_API_BASE_URL=/api and VITE_API_PROXY_TARGET to your Laravel public URL (see website/.env.example).',
        e,
      );
    }
    return siteLanguageFallback(cookieHeader);
  }
});
