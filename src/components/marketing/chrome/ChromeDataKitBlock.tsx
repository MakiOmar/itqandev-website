import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { renderLayoutBlock } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { isFeatureModuleEnabled, type FeatureModuleKey } from '~/lib/api/project-settings';
import { maxSectionSettingLimit } from '~/lib/marketing/page-layout-utils';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import {
  EMPTY_CHROME_BLOCK_SUPPORT,
  chromePageRendererProps,
  type ChromeBlockSupport,
  type ChromePageBlockProps,
} from './chrome-page-block-props';

const KIT_MODULE: Record<string, FeatureModuleKey | undefined> = {
  services_teaser: 'services',
  case_studies: 'projects',
  testimonials: 'testimonials',
  testimonial_list: 'testimonials',
  blog_preview: 'blog',
};

async function loadChromeKitSupport(
  type: string,
  locale: string,
  blogLimit: number,
): Promise<Partial<ChromeBlockSupport>> {
  const layer = await import('~/lib/marketing/content-layer');
  switch (type) {
    case 'services_teaser':
      return { services: (await layer.getSiteContent(locale)).services };
    case 'tech_stack':
      return { techStack: (await layer.getSiteContent(locale)).techStack };
    case 'case_studies': {
      const [caseStudies, portfolioCategories] = await Promise.all([
        layer.getHomeCaseStudiesForTabs(locale),
        layer.getPortfolioCategories(locale),
      ]);
      return { caseStudies, portfolioCategories };
    }
    case 'testimonials':
    case 'testimonial_list':
      return { testimonials: await layer.getTestimonials(locale) };
    case 'blog_preview':
      return {
        blogPosts: (await layer.getBlogPostsPage(locale, { page: 1, perPage: blogLimit })).items,
      };
    default:
      return {};
  }
}

/**
 * Data-driven page kit in a header/footer. The public shell does not load these lists for every
 * page, so the block renders empty on the server and fetches its own data once it scrolls into view.
 */
export const ChromeDataKitBlock = component$<ChromePageBlockProps>((props) => {
  const support = useSignal<ChromeBlockSupport>(EMPTY_CHROME_BLOCK_SUPPORT);
  const type = props.block.type;
  const featureModule = KIT_MODULE[type];
  const enabled = !featureModule || isFeatureModuleEnabled(props.features, featureModule);
  const blogLimit = maxSectionSettingLimit([props.block] as unknown as PageSectionNode[], 'blog_preview', 3);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (!enabled) return;
    try {
      const loaded = await loadChromeKitSupport(type, props.uiLocale, blogLimit);
      support.value = { ...support.value, ...loaded };
    } catch (err) {
      console.error('Chrome kit data load failed', type, err);
    }
  });

  if (!enabled) {
    return null;
  }
  return <>{renderLayoutBlock(props.block, chromePageRendererProps(props, support.value))}</>;
});
