import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

const PRICING_PAGE_SLUG = 'pricing';

function parsePublicPageDetail(json: PublicPageDetail & { data?: unknown }): PublicPageDetail | null {
  if (json && typeof json === 'object' && Array.isArray(json.sections)) {
    return json;
  }
  if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
    return json.data as PublicPageDetail;
  }
  return null;
}

export const usePricingCmsPage = routeLoader$(async ({ request, params, error, resolveValue }) => {
  const shell = await resolveValue(usePublicShell);
  if (!isFeatureModuleEnabled(shell.branding.features, 'pages')) {
    throw error(404, 'Not found');
  }

  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  let page: PublicPageDetail | null = null;
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(PRICING_PAGE_SLUG)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale,
        Cookie: cookie,
      },
    });
    if (res.ok) {
      const json = (await res.json()) as PublicPageDetail & { data?: unknown };
      page = parsePublicPageDetail(json);
    }
  } catch {
    page = null;
  }
  if (!page || typeof page.slug !== 'string' || !Array.isArray(page.sections)) {
    throw error(404, 'Not found');
  }
  return page;
});

export const usePricingSupportingData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(6, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, blogPosts: blogPosts.slice(0, 3) };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const page = usePricingCmsPage().value;
  const support = usePricingSupportingData();

  return (
    <HomepageSectionsRenderer
      sections={(page.sections || []) as PageSectionNode[]}
      uiLocale={uiLocale}
      services={shell.value.siteContent?.services ?? []}
      caseStudies={support.value.caseStudies}
      testimonials={support.value.testimonials}
      blogPosts={support.value.blogPosts}
      techStack={shell.value.siteContent?.techStack ?? []}
      branding={shell.value.branding}
      siteContact={shell.value.siteContent?.contact}
      layoutAware={true}
      allowDefaultSections={false}
      pageContext={{ title: page.title || 'Pricing', slug: page.slug }}
    />
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  let pageTitle = 'Pricing';
  let description = 'Transparent pricing for web and mobile development. Custom quotes available.';
  try {
    const page = resolveValue(usePricingCmsPage) as PublicPageDetail;
    if (page && typeof page.title === 'string' && page.title.trim()) {
      pageTitle = page.title.trim();
      if (typeof page.excerpt === 'string' && page.excerpt.trim()) {
        description = page.excerpt.trim();
      }
    }
  } catch {
    /* loader unavailable during head — keep defaults */
  }
  return publicListPageHead({
    page: pageTitle,
    description,
    resolveValue,
    usePublicShell,
    url,
  });
};
