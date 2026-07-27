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
import { usePublicShell } from './layout';

export const useHomeData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(3, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, blogPosts: blogPosts.slice(0, 3) };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const data = useHomeData();
  const shell = usePublicShell();
  const { caseStudies, testimonials, blogPosts } = data.value;
  const siteContent = shell.value.siteContent;
  const services = siteContent?.services ?? [];
  const techStack = siteContent?.techStack ?? [];
  const branding = shell.value.branding;

  return (
    <HomepageSectionsRenderer
      sections={shell.value.homepageSections}
      uiLocale={uiLocale}
      services={services}
      caseStudies={caseStudies}
      testimonials={testimonials}
      blogPosts={blogPosts}
      techStack={techStack}
      branding={branding}
    />
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  const metaFallback =
    'We build web, Android and iOS apps that scale. From MVPs to enterprise products. Modern stack, clear process, and long-term support.';

  try {
    const shell = resolveValue(usePublicShell);
    const titleTag = publicHomeTitle(shell.branding);
    const metaDescription = publicSiteDescription(shell.branding, metaFallback);
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
