import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useLocation } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { buildCanonicalHref } from '~/lib/seo/canonical-url';
import { publicHomeTitle, publicSiteDescription } from '~/lib/marketing/public-page-head';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { maxSectionSettingLimit } from '~/lib/marketing/page-layout-utils';
import { fetchPublicCmsPage } from '~/lib/marketing/public-cms-page';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { SHOW_ON_FRONT_PAGE } from '~/lib/marketing/static-homepage';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';
import { usePublicShell } from './layout';

export const useHomeData = routeLoader$(async ({ request, params, resolveValue }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  const shell = await resolveValue(usePublicShell);

  let cmsPage: PublicPageDetail | null = null;
  const frontSlug = shell.frontPage?.show_on_front === SHOW_ON_FRONT_PAGE ? shell.frontPage.slug : null;
  if (frontSlug && isFeatureModuleEnabled(shell.branding.features, 'pages')) {
    cmsPage = await fetchPublicCmsPage(frontSlug, uiLocale, cookie, request.url);
  }

  const sections = cmsPage?.sections?.length
    ? (cmsPage.sections as PageSectionNode[])
    : shell.themeBody && shell.themeBody.length > 0
      ? shell.themeBody
      : shell.homepageSections;
  const caseLimit = maxSectionSettingLimit(sections, 'case_studies', 3);
  const blogLimit = maxSectionSettingLimit(sections, 'blog_preview', 3);
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(caseLimit, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return {
    caseStudies,
    testimonials,
    blogPosts: blogPosts.slice(0, blogLimit),
    cmsPage,
  };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const data = useHomeData();
  const shell = usePublicShell();
  const { caseStudies, testimonials, blogPosts, cmsPage } = data.value;
  const siteContent = shell.value.siteContent;
  const services = siteContent?.services ?? [];
  const techStack = siteContent?.techStack ?? [];
  const branding = shell.value.branding;
  const useCmsHome = Boolean(cmsPage?.sections?.length);

  return (
    <HomepageSectionsRenderer
      sections={
        useCmsHome
          ? (cmsPage!.sections as PageSectionNode[])
          : shell.value.themeBody && shell.value.themeBody.length > 0
            ? shell.value.themeBody
            : shell.value.homepageSections
      }
      layoutAware={useCmsHome || Boolean(shell.value.themeBody && shell.value.themeBody.length > 0)}
      allowDefaultSections={!useCmsHome && !shell.value.themeBody?.length}
      uiLocale={uiLocale}
      services={services}
      caseStudies={caseStudies}
      testimonials={testimonials}
      blogPosts={blogPosts}
      techStack={techStack}
      branding={branding}
      siteContact={siteContent?.contact}
      pageContext={
        useCmsHome && cmsPage
          ? { title: cmsPage.title || 'Home', slug: cmsPage.slug }
          : undefined
      }
    />
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  const metaFallback =
    'We build web, Android and iOS apps that scale. From MVPs to enterprise products. Modern stack, clear process, and long-term support.';

  try {
    const shell = resolveValue(usePublicShell);
    const home = resolveValue(useHomeData) as { cmsPage?: PublicPageDetail | null };
    const cms = home?.cmsPage;
    const titleTag =
      cms && typeof cms.title === 'string' && cms.title.trim()
        ? cms.title.trim()
        : publicHomeTitle(shell.branding);
    const metaDescription =
      cms && typeof cms.excerpt === 'string' && cms.excerpt.trim()
        ? cms.excerpt.trim()
        : publicSiteDescription(shell.branding, metaFallback);
    return {
      title: titleTag,
      meta: [
        { name: 'description', content: metaDescription },
        { property: 'og:title', content: titleTag },
        { property: 'og:description', content: metaDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonical },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    };
  } catch {
    const titleTag = publicHomeTitle();
    return {
      title: titleTag,
      meta: [
        { name: 'description', content: metaFallback },
        { property: 'og:title', content: titleTag },
        { property: 'og:description', content: metaFallback },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonical },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    };
  }
};
