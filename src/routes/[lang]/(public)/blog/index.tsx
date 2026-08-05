import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import {
  getBlogPostsPage,
  getFeaturedCaseStudies,
  getTestimonials,
} from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { translateApp } from '~/lib/i18n/useTranslate';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import {
  BlogPostsList,
  ARTICLES_PER_PAGE,
} from '~/components/marketing/blog/BlogPostsList';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

/** CMS page slug (Admin → Pages). Public URL remains `/{lang}/blog/`. */
const ARTICLES_PAGE_SLUG = 'articles';

export const useArticlesCmsPage = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(ARTICLES_PAGE_SLUG)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale || 'en',
        Cookie: cookie,
      },
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as PublicPageDetail & { data?: unknown };
    if (json && typeof json === 'object' && Array.isArray(json.sections)) {
      return json;
    }
    if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
      return json.data as PublicPageDetail;
    }
    return null;
  } catch {
    return null;
  }
});

export const useArticlesListingData = routeLoader$(async ({ request, url, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url) || 'en';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const fetchContext = { forwardDocumentUrl: request.url, forwardCookies: cookie };
  const [list, caseStudies, testimonials] = await Promise.all([
    getBlogPostsPage(uiLocale, { page, perPage: ARTICLES_PER_PAGE }, fetchContext),
    getFeaturedCaseStudies(6, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
  ]);
  return {
    list,
    uiLocale,
    caseStudies,
    testimonials,
    blogPosts: list.items.slice(0, 3),
  };
});

/** Legacy hard-coded layout when CMS page slug `articles` is missing or pages module is off. */
const LegacyArticlesFallback = component$(() => {
  const loc = useLocation();
  const listing = useArticlesListingData();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center">
              <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                {translateApp(uiLocale, 'articlesPage.eyebrow')}
              </p>
              <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                {translateApp(uiLocale, 'articlesPage.title')}
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                {translateApp(uiLocale, 'articlesPage.subtitle')}
              </p>
            </div>
          </AnimatedReveal>

          <div class="mt-12">
            <BlogPostsList uiLocale={uiLocale} initialList={listing.value.list} />
          </div>
        </Container>
      </Section>

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
              name: translateApp(uiLocale, 'articlesPage.title'),
            },
          ],
        })}
      />
    </>
  );
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const cms = useArticlesCmsPage();
  const listing = useArticlesListingData();
  const pagesOn = isFeatureModuleEnabled(shell.value.branding.features, 'pages');
  const page = cms.value;

  if (
    pagesOn &&
    page &&
    typeof page === 'object' &&
    typeof page.slug === 'string' &&
    Array.isArray(page.sections)
  ) {
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
          pageContext={{ title: page.title || 'Articles', slug: page.slug }}
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
  }

  return <LegacyArticlesFallback />;
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const lang = uiLangFromUrlPathname(url.pathname);
  let pageTitle = translateApp(lang, 'articlesPage.title');
  let description = translateApp(lang, 'articlesPage.subtitle');
  try {
    const page = resolveValue(useArticlesCmsPage) as PublicPageDetail | null;
    if (page && typeof page.title === 'string' && page.title.trim()) {
      pageTitle = page.title.trim();
      if (typeof page.excerpt === 'string' && page.excerpt.trim()) {
        description = page.excerpt.trim();
      }
    }
  } catch {
    /* loader unavailable during head */
  }
  return publicListPageHead({
    page: pageTitle,
    description,
    resolveValue,
    usePublicShell,
    url,
  });
};
