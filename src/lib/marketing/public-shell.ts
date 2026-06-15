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
};

export type PublicShellState = {
  branding: PublicBrandingState;
  primaryMenu: PublicNavItem[];
  siteContent: SiteContent;
};

type PublicShellApiData = {
  site_meta?: Record<string, unknown>;
  menu?: { items?: PublicNavItem[] };
  services?: Record<string, unknown>[];
};

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
    },
    primaryMenu: [],
    siteContent: base,
  };
}

function mapShellApiPayload(data: PublicShellApiData, fallbackName: string): PublicShellState {
  const siteMeta =
    data.site_meta && typeof data.site_meta === 'object'
      ? (data.site_meta as Record<string, unknown>)
      : {};
  const menuItems = Array.isArray(data.menu?.items) ? data.menu!.items! : [];
  const base = { ...(siteData as SiteContent) } as SiteContent;
  return {
    branding: brandingFromSiteMeta(siteMeta, fallbackName),
    primaryMenu: menuItems,
    siteContent: mergeShellServicesIntoSiteContent(base, data.services),
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
