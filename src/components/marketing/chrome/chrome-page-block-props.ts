import type { HomepageSectionsRendererProps } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import type { PageLayoutBlock } from '~/lib/marketing/appearance-types';
import type { ChromeKitViewProps } from './ChromeKitView';

export type ChromePageBlockProps = {
  block: PageLayoutBlock;
  uiLocale: string;
  branding?: ChromeKitViewProps['branding'];
  features?: ChromeKitViewProps['features'];
  contact?: ChromeKitViewProps['contact'];
};

export type ChromeBlockSupport = Pick<
  HomepageSectionsRendererProps,
  'services' | 'caseStudies' | 'testimonials' | 'blogPosts' | 'techStack' | 'portfolioCategories'
>;

export const EMPTY_CHROME_BLOCK_SUPPORT: ChromeBlockSupport = {
  services: [],
  caseStudies: [],
  testimonials: [],
  blogPosts: [],
  techStack: [],
  portfolioCategories: [],
};

/** Page-renderer props for a page widget/kit placed in a header or footer. */
export function chromePageRendererProps(
  props: ChromePageBlockProps,
  support: ChromeBlockSupport,
): HomepageSectionsRendererProps {
  return {
    ...support,
    uiLocale: props.uiLocale,
    branding: {
      name: props.branding?.name || '',
      logo: props.branding?.logo || '',
      logoDark: props.branding?.logoDark || '',
      logoLight: props.branding?.logoLight || '',
      site_languages: props.branding?.site_languages ?? [],
      features: props.features,
    },
    siteContact: props.contact ?? null,
  };
}
