import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { usePublicShell } from '../../layout';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { marketingEntityDetailHead } from '~/lib/marketing/marketing-entity-document-head';
import { publicSiteName } from '~/lib/marketing/public-page-head';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import { mapMarketingSeoMetaFromApi } from '~/lib/marketing/seo-snippet';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

export const usePublicPageDetail = routeLoader$(async ({ params, request, fail }) => {
  const slug = decodeURIComponent(String(params.slug ?? '').trim());
  if (!slug) {
    return fail(404, { message: 'Not found' });
  }
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(slug)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale,
        Cookie: cookie,
      },
    });
    if (!res.ok) {
      return fail(404, { message: 'Page not found' });
    }
    const json = (await res.json()) as PublicPageDetail & { data?: unknown };
    if (json && typeof json === 'object' && Array.isArray(json.sections)) {
      return json;
    }
    if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
      return json.data as PublicPageDetail;
    }
    return json as PublicPageDetail;
  } catch {
    return fail(404, { message: 'Page not found' });
  }
});

export const usePageSupportingData = routeLoader$(async ({ request, params }) => {
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
  const raw = usePublicPageDetail().value as unknown;
  if (
    raw == null ||
    typeof raw !== 'object' ||
    (raw as { failed?: boolean }).failed === true ||
    typeof (raw as PublicPageDetail).slug !== 'string'
  ) {
    return null;
  }
  const page = raw as PublicPageDetail;
  const shell = usePublicShell();
  const support = usePageSupportingData();
  const sections = (page.sections || []) as PageSectionNode[];

  return (
    <HomepageSectionsRenderer
      sections={sections}
      uiLocale={uiLocale}
      services={shell.value.siteContent?.services ?? []}
      caseStudies={support.value.caseStudies}
      testimonials={support.value.testimonials}
      blogPosts={support.value.blogPosts}
      techStack={shell.value.siteContent?.techStack ?? []}
      branding={shell.value.branding}
      layoutAware={true}
      allowDefaultSections={false}
      pageContext={{ title: page.title, slug: page.slug }}
    />
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  try {
    const shell = resolveValue(usePublicShell);
    const page = resolveValue(usePublicPageDetail) as PublicPageDetail;
    if (!page || typeof page.title !== 'string') {
      return { title: 'Page' };
    }
    const brandName = publicSiteName(shell.branding);
    return marketingEntityDetailHead({
      brandName,
      baseUrl: getPublicSiteBaseUrl(url.origin).replace(/\/$/, ''),
      sectionLabel: 'Pages',
      pageUrl: url,
      defaultTitle: page.title,
      defaultDescription: page.excerpt || page.title,
      seo: mapMarketingSeoMetaFromApi(page.seo_meta),
    });
  } catch {
    return { title: 'Page' };
  }
};
