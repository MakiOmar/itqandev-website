/**
 * Public marketing layout shell — one API round-trip for branding, menu, and services.
 */

import siteData from '../../content/site.json';
import { getConfig } from '~/lib/config';
import { resolvePublicSiteLanguages } from '~/lib/i18n/public-site-languages';
import { marketingGet, getMarketingApiBaseUrl, type MarketingFetchContext } from './api-client';
import { MARKETING_ENDPOINTS } from './endpoints';
import { mapPublicBrandingFromApi } from './resolve-laravel-media-url';
import type { PublicNavItem } from './public-menu';
import type { Service, SiteContent } from './types';
import { parseSiteTypography } from '~/lib/perf/typography';
import type { SiteTypography } from '~/types/typography';
import { mapMarketingSeoMetaFromApi } from './seo-snippet';
import { isDevSsrMarketingFetchFailure } from './ssr-api-reachability';
import {
  defaultHomepageSections,
  type FooterPublicPayload,
  type HeaderPublicPayload,
  type HomepageSectionInstance,
  type PageSectionNode,
} from './appearance-types';
import { defaultFooterSections, defaultHeaderSections } from './chrome-defaults';
import { isSearchEngineIndexingEnabled } from '~/lib/seo/search-engine-indexing';
import {
  parsePublicFrontPageMeta,
  type PublicFrontPageMeta,
} from './static-homepage';
const localBase = siteData as SiteContent;

export type PublicBrandingState = {
  name: string;
  site_description?: string;
  logo: string;
  logoDark: string;
  logoLight: string;
  site_languages: ReturnType<typeof resolvePublicSiteLanguages>;
  features?: Record<string, boolean>;
  typography?: SiteTypography;
  /** When false, public pages send noindex and robots.txt disallows crawling. */
  search_engine_indexing?: boolean;
};

export type { PublicFrontPageMeta };

export type PublicShellState = {
  branding: PublicBrandingState;
  primaryMenu: PublicNavItem[];
  siteContent: SiteContent;
  homepageSections: HomepageSectionInstance[];
  /** Theme Builder body (band layout) when matched for homepage / 404. */
  themeBody: PageSectionNode[] | null;
  themeContext: string | null;
  header: HeaderPublicPayload;
  footer: FooterPublicPayload;
  /** WordPress-style static front page from site_meta. */
  frontPage: PublicFrontPageMeta;
};

type PublicShellApiData = {
  site_meta?: Record<string, unknown>;
  menu?: { items?: PublicNavItem[] };
  services?: Record<string, unknown>[];
  homepage_sections?: HomepageSectionInstance[];
  theme_body?: { sections?: PageSectionNode[] } | null;
  theme_context?: string | null;
  header?: HeaderPublicPayload;
  footer?: FooterPublicPayload;
};

function normalizeChromePayload(
  raw: unknown,
  fallback: () => PageSectionNode[],
): { sections: PageSectionNode[] } {
  if (!raw || typeof raw !== 'object') {
    return { sections: fallback() };
  }
  const sections = (raw as { sections?: unknown }).sections;
  if (Array.isArray(sections) && sections.length > 0) {
    return { sections: sections as PageSectionNode[] };
  }
  return { sections: fallback() };
}
function normalizeServiceFromPublicApi(raw: Record<string, unknown>): Service {
  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? ''),
    shortDescription: String(raw.shortDescription ?? raw.short_description ?? ''),
    description: String(raw.description ?? ''),
    process: Array.isArray(raw.process) ? (raw.process as string[]) : undefined,
    deliverables: Array.isArray(raw.deliverables) ? (raw.deliverables as string[]) : undefined,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    seoMeta: mapMarketingSeoMetaFromApi(raw.seo_meta),
  };
}

function brandingFromSiteMeta(
  settings: Record<string, unknown> | undefined,
  fallbackName: string,
): PublicBrandingState {
  const branding = mapPublicBrandingFromApi(settings ?? {}, fallbackName);
  const features =
    settings?.features && typeof settings.features === 'object'
      ? (settings.features as Record<string, boolean>)
      : undefined;

  const siteDescription =
    (typeof settings?.site_description === 'string' && settings.site_description.trim()) ||
    (typeof settings?.description === 'string' && settings.description.trim()) ||
    undefined;

  return {
    name: branding.name,
    site_description: siteDescription,
    logo: branding.logo,
    logoDark: branding.logoDark,
    logoLight: branding.logoLight,
    site_languages: resolvePublicSiteLanguages(settings?.site_languages),
    features,
    typography: parseSiteTypography(settings?.typography),
    search_engine_indexing: isSearchEngineIndexingEnabled(settings?.search_engine_indexing),
  };
}

export function mergeShellServicesIntoSiteContent(
  base: SiteContent,
  services: Record<string, unknown>[] | undefined,
): SiteContent {
  const arr = Array.isArray(services) ? services : [];
  if (arr.length === 0) {
    return base;
  }

  return {
    ...base,
    services: arr
      .filter((row) => row && typeof row === 'object')
      .map((row) => normalizeServiceFromPublicApi(row as Record<string, unknown>)),
  };
}

function localShellFallback(): PublicShellState {
  const fallbackName = getConfig().branding.name;
  const base = { ...localBase } as SiteContent;

  return {
    branding: {
      name: fallbackName,
      logo: '',
      logoDark: '',
      logoLight: '',
      site_languages: resolvePublicSiteLanguages(null),
      features: undefined,
      search_engine_indexing: true,
    },
    primaryMenu: [],
    siteContent: base,
    homepageSections: defaultHomepageSections(),
    themeBody: null,
    themeContext: null,
    header: { sections: defaultHeaderSections([]) },
    footer: { sections: defaultFooterSections() },
    frontPage: parsePublicFrontPageMeta(null),
  };
}

function mapShellApiPayload(data: PublicShellApiData, fallbackName: string): PublicShellState {
  const siteMeta =
    data.site_meta && typeof data.site_meta === 'object'
      ? (data.site_meta as Record<string, unknown>)
      : {};
  const menuItems = Array.isArray(data.menu?.items) ? data.menu!.items! : [];
  const base = { ...(siteData as SiteContent) } as SiteContent;
  const homepageSections = Array.isArray(data.homepage_sections) && data.homepage_sections.length > 0
    ? data.homepage_sections
    : defaultHomepageSections();

  const themeBodySections =
    data.theme_body &&
    typeof data.theme_body === 'object' &&
    Array.isArray(data.theme_body.sections) &&
    data.theme_body.sections.length > 0
      ? (data.theme_body.sections as PageSectionNode[])
      : null;

  return {
    branding: brandingFromSiteMeta(siteMeta, fallbackName),
    primaryMenu: menuItems,
    siteContent: mergeShellServicesIntoSiteContent(base, data.services),
    homepageSections,
    themeBody: themeBodySections,
    themeContext: typeof data.theme_context === 'string' ? data.theme_context : null,
    header: normalizeChromePayload(data.header, () => defaultHeaderSections(menuItems)),
    footer: normalizeChromePayload(data.footer, () => defaultFooterSections()),
    frontPage: parsePublicFrontPageMeta(siteMeta),
  };
}
/**
 * Fetch layout shell from Laravel (or local fallback when API base is unset).
 */
/** Resolve a published service from an already-loaded shell (avoids duplicate API round-trip). */
export function resolveServiceFromShell(shell: PublicShellState, slug: string): Service | null {
  const normalized = decodeURIComponent(String(slug ?? '').trim());
  if (!normalized) {
    return null;
  }
  const services = shell.siteContent?.services ?? [];
  return services.find((s) => s.slug === normalized) ?? null;
}

export async function fetchPublicShell(
  locale: string | null | undefined,
  fetchContext?: MarketingFetchContext,
): Promise<PublicShellState> {
  const fallbackName = getConfig().branding.name;

  if (!getMarketingApiBaseUrl(fetchContext?.forwardDocumentUrl).trim()) {
    return localShellFallback();
  }

  try {
    const q = new URLSearchParams();
    if (locale && String(locale).trim() !== '') {
      q.set('locale', String(locale).trim().toLowerCase());
    }
    const docUrl = fetchContext?.forwardDocumentUrl;
    if (docUrl && String(docUrl).trim() !== '') {
      try {
        const path = new URL(String(docUrl), 'http://local.invalid').pathname;
        if (path) q.set('path', path);
      } catch {
        /* ignore */
      }
    }
    const themeCtx = fetchContext?.themeContext;
    if (themeCtx && String(themeCtx).trim() !== '') {
      q.set('theme_context', String(themeCtx).trim().toLowerCase());
    }
    const path = q.toString()
      ? `${MARKETING_ENDPOINTS.shell}?${q.toString()}`
      : MARKETING_ENDPOINTS.shell;

    const data = await marketingGet<PublicShellApiData>(path, locale ?? undefined, fetchContext);

    if (!data || typeof data !== 'object') {
      return localShellFallback();
    }

    const shell = mapShellApiPayload(data, fallbackName);
    return shell;
  } catch (e) {
    if (!isDevSsrMarketingFetchFailure(e)) {
      console.warn('[marketing] fetch public shell failed', e);
    }
    return localShellFallback();
  }
}
