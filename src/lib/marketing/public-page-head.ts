import type { DocumentHeadProps, DocumentHeadValue } from '@builder.io/qwik-city';
import { buildCanonicalHref, getPublicSiteBaseUrl, resolveAbsoluteCanonicalUrl } from '~/lib/seo/canonical-url';
import { getConfig } from '~/lib/config';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';
import { isSearchEngineIndexingEnabled, publicRobotsContent } from '~/lib/seo/search-engine-indexing';
import { applyTitleTemplate, resolveSeoDefaults } from '~/lib/seo/seo-defaults';
import { jsonLdScript } from '~/lib/seo/json-ld';
import { mapMarketingSeoMetaFromApi } from './seo-snippet';
import type { PublicPageDetail } from '~/types/page';

/** Internal Qwik dashboard label — not a public marketing site name. */
const INTERNAL_DASHBOARD_LABEL = 'Dashboard';

function configuredPublicSiteName(): string {
  const fromConfig = getConfig().branding.name?.trim();
  if (fromConfig && fromConfig !== INTERNAL_DASHBOARD_LABEL) {
    return fromConfig;
  }
  const fromEnv = import.meta.env.VITE_APP_NAME;
  if (typeof fromEnv === 'string') {
    const trimmed = fromEnv.trim();
    if (trimmed && trimmed !== INTERNAL_DASHBOARD_LABEL) {
      return trimmed;
    }
  }
  return fromConfig || INTERNAL_DASHBOARD_LABEL;
}

/** Localized site name for document head (falls back to VITE branding). */
export function publicSiteName(branding?: PublicBrandingState | null): string {
  const fromApi = branding?.name?.trim();
  if (fromApi && fromApi !== INTERNAL_DASHBOARD_LABEL) {
    return fromApi;
  }
  return configuredPublicSiteName();
}

/** Localized meta description when API provides site_description on branding payload. */
export function publicSiteDescription(
  branding?: PublicBrandingState | null,
  fallback = '',
): string {
  const fromApi = branding?.site_description?.trim();
  if (fromApi) {
    return fromApi;
  }
  return fallback;
}

/** Homepage `<title>` — site name first, then positioning line. */
export function publicHomeTitle(branding?: PublicBrandingState | null): string {
  return `${publicSiteName(branding)} | Web, Android & iOS Development`;
}

export interface PublicListPageHeadInput {
  page: string;
  /** Route fallback copy, used after the CMS page excerpt and the SEO defaults. */
  description: string;
  resolveValue: DocumentHeadProps['resolveValue'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usePublicShell: any;
  url: URL;
  /** CMS `exclude_from_search` for pretty marketing URLs backed by a page. */
  pageExcluded?: boolean;
  /** CMS page backing this URL; its SEO fields and the `page` type defaults apply. */
  cmsPage?: PublicPageDetail | null;
}

/** Shared document head for public marketing list pages and the static front page. */
export function publicListPageHead({
  page,
  description,
  resolveValue,
  usePublicShell,
  url,
  pageExcluded,
  cmsPage,
}: PublicListPageHeadInput): DocumentHeadValue {
  const shell = resolveValue(usePublicShell) as { branding?: PublicBrandingState | null };
  const branding = shell.branding;
  const seo = cmsPage ? mapMarketingSeoMetaFromApi(cmsPage.seo_meta) : undefined;
  const defaults = resolveSeoDefaults(branding?.seo_defaults, cmsPage ? 'page' : null);
  const docTitle = seo?.metaTitle?.trim() || page;
  const pageTitle = applyTitleTemplate(defaults.titleTemplate, {
    title: docTitle,
    section: '',
    site: publicSiteName(branding),
  });
  const docDesc =
    seo?.metaDescription?.trim() || cmsPage?.excerpt?.trim() || defaults.description || description;
  const ogTitle = seo?.ogTitle?.trim() || pageTitle;
  const ogDesc = seo?.ogDescription?.trim() || docDesc;
  const selfUrl = buildCanonicalHref(url.pathname, url.origin);
  const canonical = seo?.canonicalUrl?.trim()
    ? resolveAbsoluteCanonicalUrl(seo.canonicalUrl.trim(), getPublicSiteBaseUrl(url.origin).replace(/\/$/, ''))
    : selfUrl;
  const ogImage = seo?.ogImage?.trim() || defaults.ogImage;
  const robots = publicRobotsContent({
    siteIndexingEnabled: isSearchEngineIndexingEnabled(branding?.search_engine_indexing),
    pageExcluded,
  });
  const meta: { name?: string; property?: string; content: string }[] = [
    { name: 'description', content: docDesc },
    { property: 'og:title', content: ogTitle },
    { property: 'og:description', content: ogDesc },
    { property: 'og:url', content: selfUrl },
  ];
  if (ogImage) {
    meta.push({ property: 'og:image', content: ogImage });
  }
  meta.push({
    name: 'twitter:card',
    content: seo?.twitterCard?.trim() || defaults.twitterCard || (ogImage ? 'summary_large_image' : 'summary'),
  });
  if (robots) {
    meta.push({ name: 'robots', content: robots });
  }
  return {
    title: pageTitle,
    meta,
    links: [{ rel: 'canonical', href: canonical }],
    scripts:
      seo?.schema != null
        ? [{ key: 'page-json-ld', script: jsonLdScript(seo.schema), props: { type: 'application/ld+json' } }]
        : [],
  };
}
