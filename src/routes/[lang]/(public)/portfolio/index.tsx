import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import {
  getCaseStudiesPage,
  getPortfolioCategories,
  getFeaturedCaseStudies,
  getTestimonials,
  getBlogPosts,
} from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { translateApp } from '~/lib/i18n/useTranslate';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { PORTFOLIO_PER_PAGE } from '~/components/marketing/portfolio/PortfolioProjectsList';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

const PORTFOLIO_PAGE_SLUG = 'portfolio';

function parsePublicPageDetail(json: PublicPageDetail & { data?: unknown }): PublicPageDetail | null {
  if (json && typeof json === 'object' && Array.isArray(json.sections)) {
    return json;
  }
  if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
    return json.data as PublicPageDetail;
  }
  return null;
}

export const usePortfolioCmsPage = routeLoader$(async ({ request, params, error, resolveValue }) => {
  const shell = await resolveValue(usePublicShell);
  if (!isFeatureModuleEnabled(shell.branding.features, 'pages')) {
    throw error(404, 'Not found');
  }

  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  let page: PublicPageDetail | null = null;
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(PORTFOLIO_PAGE_SLUG)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale || 'en',
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

export const usePortfolioListingData = routeLoader$(async ({ request, url, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url) || 'en';
  const categorySlug = url.searchParams.get('category_slug')?.trim() || undefined;
  const skillSlug = url.searchParams.get('skill_slug')?.trim() || undefined;
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const fetchContext = { forwardDocumentUrl: request.url, forwardCookies: cookie };
  const [list, categories, caseStudies, testimonials, blogPosts] = await Promise.all([
    getCaseStudiesPage(
      uiLocale,
      { categorySlug, skillSlug, page, perPage: PORTFOLIO_PER_PAGE },
      fetchContext,
    ),
    getPortfolioCategories(uiLocale, fetchContext),
    getFeaturedCaseStudies(6, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return {
    list,
    categories,
    categorySlug: categorySlug ?? null,
    skillSlug: skillSlug ?? null,
    uiLocale,
    caseStudies,
    testimonials,
    blogPosts: blogPosts.slice(0, 3),
  };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const page = usePortfolioCmsPage().value;
  const listing = usePortfolioListingData();

  return (
    <>
      <HomepageSectionsRenderer
        sections={(page.sections || []) as PageSectionNode[]}
        uiLocale={uiLocale}
        services={shell.value.siteContent?.services ?? []}
        caseStudies={listing.value.caseStudies}
        testimonials={listing.value.testimonials}
        blogPosts={listing.value.blogPosts}
        techStack={shell.value.siteContent?.techStack ?? []}
        branding={shell.value.branding}
        siteContact={shell.value.siteContent?.contact}
        layoutAware={true}
        allowDefaultSections={false}
        pageContext={{ title: page.title || 'Portfolio', slug: page.slug }}
        portfolioList={listing.value.list}
        portfolioCategories={listing.value.categories}
        portfolioCategorySlug={listing.value.categorySlug}
        portfolioSkillSlug={listing.value.skillSlug}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: translateApp(uiLocale, 'portfolioPage.homeCrumb'),
              item: getPublicSiteBaseUrl(),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: page.title || translateApp(uiLocale, 'portfolioPage.title'),
            },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const lang = uiLangFromUrlPathname(url.pathname);
  let pageTitle = translateApp(lang, 'portfolioPage.title');
  let description = translateApp(lang, 'portfolioPage.subtitle');
  let pageExcluded = false;
  try {
    const page = resolveValue(usePortfolioCmsPage) as PublicPageDetail;
    if (page && typeof page.title === 'string' && page.title.trim()) {
      pageTitle = page.title.trim();
      if (typeof page.excerpt === 'string' && page.excerpt.trim()) {
        description = page.excerpt.trim();
      }
    }
    pageExcluded = page?.exclude_from_search === true;
  } catch {
    /* loader unavailable during head */
  }
  return publicListPageHead({
    page: pageTitle,
    description,
    resolveValue,
    usePublicShell,
    url,
    pageExcluded,
  });
};
