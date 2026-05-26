/**
 * Client-side marketing API (Vite /api proxy). Used in dev when SSR skips WAMP calls.
 */

import { useVisibleTask$, type Signal } from '@builder.io/qwik';
import type { PublicNavItem } from './public-menu';
import { MARKETING_ENDPOINTS } from './endpoints';
import { marketingGet } from './api-client';
import {
  getBlogPosts,
  getFeaturedCaseStudies,
  getSiteContent,
  getTestimonials,
} from './content-layer';
import type { BlogPost, CaseStudy, SiteContent, Testimonial } from './types';
import { resolvePublicSiteLanguages } from '../i18n/public-site-languages';
import { getConfig } from '../config';

export type PublicBrandingState = {
  name: string;
  logo: string;
  logoDark: string;
  logoLight: string;
  site_languages: ReturnType<typeof resolvePublicSiteLanguages>;
  features?: Record<string, boolean>;
};

export async function fetchPublicBrandingClient(): Promise<PublicBrandingState> {
  const fallbackName = getConfig().branding.name;
  try {
    const settings = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta, null, {
      forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
    });
    const name =
      (typeof settings?.site_name === 'string' && settings.site_name) ||
      (typeof settings?.name === 'string' && settings.name) ||
      fallbackName;
    const logo = (settings?.logo as string) || (settings?.site_logo as string) || '';
    const logoDark =
      (settings?.logoDark as string) ||
      (settings?.logo_dark as string) ||
      (settings?.dark_logo as string) ||
      (settings?.site_logo_dark as string) ||
      '';
    const logoLight =
      (settings?.logoLight as string) ||
      (settings?.logo_light as string) ||
      (settings?.light_logo as string) ||
      (settings?.site_logo_light as string) ||
      '';
    const features =
      settings?.features && typeof settings.features === 'object'
        ? (settings.features as Record<string, boolean>)
        : undefined;
    return {
      name,
      logo,
      logoDark,
      logoLight,
      site_languages: resolvePublicSiteLanguages(settings?.site_languages),
      features,
    };
  } catch {
    return {
      name: fallbackName,
      logo: '',
      logoDark: '',
      logoLight: '',
      site_languages: resolvePublicSiteLanguages(null),
      features: undefined,
    };
  }
}

export async function fetchPublicPrimaryMenuClient(uiLocale: string): Promise<PublicNavItem[]> {
  try {
    const path = `${MARKETING_ENDPOINTS.menuBySlug('primary')}?locale=${encodeURIComponent(uiLocale)}`;
    const payload = await marketingGet<{ items?: PublicNavItem[] }>(path, uiLocale, {
      forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
    });
    const items = payload?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function fetchHomeDataClient(uiLocale: string): Promise<{
  caseStudies: CaseStudy[];
  testimonials: Testimonial[];
  siteContent: SiteContent;
  blogPosts: BlogPost[];
}> {
  const fetchContext = {
    forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
  };
  const [caseStudies, testimonials, siteContent, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(3, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getSiteContent(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, siteContent, blogPosts: blogPosts.slice(0, 3) };
}

/** Hydrate branding + menu from browser /api proxy after SSR used local fallbacks. */
export function useDevClientMarketingHydration(
  branding: Signal<PublicBrandingState>,
  primaryMenu: Signal<PublicNavItem[]>,
  uiLocale: string,
) {
  useVisibleTask$(async () => {
    if (!import.meta.env.DEV) {
      return;
    }
    const [nextBranding, nextMenu] = await Promise.all([
      fetchPublicBrandingClient(),
      fetchPublicPrimaryMenuClient(uiLocale),
    ]);
    branding.value = nextBranding;
    primaryMenu.value = nextMenu;
  });
}
