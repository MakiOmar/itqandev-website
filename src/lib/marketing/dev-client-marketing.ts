/**
 * Client-side marketing API (Vite /api proxy). Used in dev when SSR skips WAMP calls.
 */

import { useVisibleTask$, type Signal } from '@builder.io/qwik';
import type { PublicNavItem } from './public-menu';
import { publicHeaderLanguageOptions } from '../i18n/public-site-languages';
import {
  getBlogPosts,
  getFeaturedCaseStudies,
  getTestimonials,
} from './content-layer';
import type { BlogPost, CaseStudy, Testimonial } from './types';
import { fetchPublicShell, type PublicBrandingState } from './public-shell';

export type { PublicBrandingState } from './public-shell';

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
    const shell = await fetchPublicShell(uiLocale, {
      forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
    });
    branding.value = {
      ...shell.branding,
      site_languages: publicHeaderLanguageOptions(shell.branding.site_languages),
    };
    primaryMenu.value = shell.primaryMenu;
  });
}

export async function fetchHomeDataClient(uiLocale: string): Promise<{
  caseStudies: CaseStudy[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
}> {
  const fetchContext = {
    forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
  };
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(3, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, blogPosts: blogPosts.slice(0, 3) };
}
