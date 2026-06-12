import { routeLoader$ } from '@builder.io/qwik-city';
import { extractCookieHeader } from '../api/client';
import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { marketingGet } from '../marketing/api-client';
import { shouldSkipSsrMarketingApi, isDevSsrMarketingFetchFailure } from '../marketing/ssr-api-reachability';
import { defaultSystemTypography, parseSiteTypography } from '../perf/typography';
import type { SiteTypography } from '~/types/typography';

/**
 * Resolved typography from GET /api/public/site-meta (`typography` field).
 * Used for @font-face injection, CSS variables, and Google Fonts policy.
 */
export const useSiteTypography = routeLoader$(async ({ cookie, request }): Promise<SiteTypography> => {
  const cookieHeader = extractCookieHeader(cookie, request);
  if (typeof window === 'undefined' && shouldSkipSsrMarketingApi()) {
    return defaultSystemTypography();
  }

  try {
    const settings = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta, null, {
      forwardCookies: cookieHeader,
      forwardDocumentUrl: request.url,
    });
    return parseSiteTypography(settings?.typography);
  } catch (e) {
    if (import.meta.env.DEV && !isDevSsrMarketingFetchFailure(e)) {
      console.warn('useSiteTypography: site-meta request failed; using system typography defaults.', e);
    }
    return defaultSystemTypography();
  }
});
