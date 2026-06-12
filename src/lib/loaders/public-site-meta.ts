import { routeLoader$ } from '@builder.io/qwik-city';
import { extractCookieHeader } from '../api/client';
import type { SiteLanguageRow } from '../../types/site-language';
import { secondaryLocales } from '../content-translations';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { marketingGet } from '../marketing/api-client';
import { shouldSkipSsrMarketingApi, isDevSsrMarketingFetchFailure } from '../marketing/ssr-api-reachability';
import { readPreferredLocaleFromCookieHeader } from '../i18n/dashboard-locale';
import { resolvePublicSiteLanguages } from '../i18n/public-site-languages';
import { defaultSystemTypography, parseSiteTypography } from '../perf/typography';
import type { SiteTypography } from '~/types/typography';

export interface PublicSiteMetaState {
  typography: SiteTypography;
  site_languages: SiteLanguageRow[];
  default_locale: string;
  secondary: SiteLanguageRow[];
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

function siteMetaFallback(cookieHeader: string | null): PublicSiteMetaState {
  const site_languages = resolvePublicSiteLanguages(null);
  const default_locale = 'en';
  return {
    typography: defaultSystemTypography(),
    site_languages,
    default_locale,
    secondary: secondaryLocales(site_languages, default_locale),
    content_editing_locale: pickContentEditingLocale(site_languages, default_locale, cookieHeader),
  };
}

/**
 * Single GET /api/public/site-meta for admin typography + language config (replaces duplicate loaders).
 */
export const usePublicSiteMeta = routeLoader$(async ({ cookie, request }): Promise<PublicSiteMetaState> => {
  const cookieHeader = extractCookieHeader(cookie, request);
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return siteMetaFallback(cookieHeader);
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

    return {
      typography: parseSiteTypography(settings?.typography),
      site_languages,
      default_locale,
      secondary: secondaryLocales(site_languages, default_locale),
      content_editing_locale: pickContentEditingLocale(site_languages, default_locale, cookieHeader),
    };
  } catch (e) {
    if (import.meta.env.DEV && !isDevSsrMarketingFetchFailure(e)) {
      console.warn('usePublicSiteMeta: site-meta request failed; using defaults.', e);
    }
    return siteMetaFallback(cookieHeader);
  }
});
