import { component$, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import {
  getBlogPostsPage,
  getPageBuilderMarketingSupport,
  getTestimonials,
} from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { translateApp } from '~/lib/i18n/useTranslate';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { ARTICLES_PER_PAGE } from '~/components/marketing/blog/BlogPostsList';
import { resolveIndexCmsPage } from '~/lib/marketing/public-cms-page';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';
import { cmsPageEditTarget, useAdminEditTarget } from '~/lib/marketing/admin-edit-target';

/** CMS page slug (Admin → Pages). Public URL remains `/{lang}/blog/`. */
const ARTICLES_PAGE_SLUG = 'articles';

export const useArticlesCmsPage = routeLoader$(async ({ request, params, error, resolveValue }) => {
  const shell = await resolveValue(usePublicShell);
  const cookie = request.headers.get('cookie') || '';
  const page = await resolveIndexCmsPage({
    slug: ARTICLES_PAGE_SLUG,
    fallbackTitle: 'Articles',
    shell,
    uiLocale: uiLocaleFromPublicRoute(cookie, params.lang, request.url) || 'en',
    cookie,
    requestUrl: request.url,
  });
  if (!page) {
    throw error(404, 'Not found');
  }
  return page;
});

export const useArticlesListingData = routeLoader$(async ({ request, url, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url) || 'en';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const fetchContext = { forwardDocumentUrl: request.url, forwardCookies: cookie };
  const [list, support, testimonials] = await Promise.all([
    getBlogPostsPage(uiLocale, { page, perPage: ARTICLES_PER_PAGE }, fetchContext),
    getPageBuilderMarketingSupport(uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
  ]);
  return {
    list,
    uiLocale,
    caseStudies: support.caseStudies,
    portfolioCategories: support.portfolioCategories,
    testimonials,
    blogPosts: list.items.slice(0, 3),
  };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const pageLoader = useArticlesCmsPage();
  useAdminEditTarget(useComputed$(() => cmsPageEditTarget(pageLoader.value)));
  const page = pageLoader.value;
  const listing = useArticlesListingData();

  return (
    <>
      <HomepageSectionsRenderer
        sections={(page.sections || []) as PageSectionNode[]}
        uiLocale={uiLocale}
        services={shell.value.siteContent?.services ?? []}
        caseStudies={listing.value.caseStudies}
        portfolioCategories={listing.value.portfolioCategories}
        testimonials={listing.value.testimonials}
        blogPosts={listing.value.blogPosts}
        techStack={shell.value.siteContent?.techStack ?? []}
        branding={shell.value.branding}
        siteContact={shell.value.siteContent?.contact}
        layoutAware={true}
        allowDefaultSections={false}
        pageContext={{ title: page.title || 'Articles', subtitle: page.subtitle ?? undefined, slug: page.slug }}
        blogList={listing.value.list}
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
              name: translateApp(uiLocale, 'articlesPage.homeCrumb'),
              item: getPublicSiteBaseUrl(),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: page.title || translateApp(uiLocale, 'articlesPage.title'),
            },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const lang = uiLangFromUrlPathname(url.pathname);
  let pageTitle = translateApp(lang, 'articlesPage.title');
  let description = translateApp(lang, 'articlesPage.subtitle');
  let pageExcluded = false;
  try {
    const page = resolveValue(useArticlesCmsPage) as PublicPageDetail;
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
