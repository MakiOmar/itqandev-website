import { component$, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { getPageBuilderMarketingSupport } from '~/lib/marketing/content-layer';
import { resolveIndexCmsPage } from '~/lib/marketing/public-cms-page';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';
import { cmsPageEditTarget, useAdminEditTarget } from '~/lib/marketing/admin-edit-target';

const SERVICES_PAGE_SLUG = 'services';

export const useServicesCmsPage = routeLoader$(async ({ request, params, error, resolveValue }) => {
  const shell = await resolveValue(usePublicShell);
  const cookie = request.headers.get('cookie') || '';
  const page = await resolveIndexCmsPage({
    slug: SERVICES_PAGE_SLUG,
    fallbackTitle: 'Services',
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

export const useServicesSupportingData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  return getPageBuilderMarketingSupport(uiLocale, fetchContext);
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const pageLoader = useServicesCmsPage();
  useAdminEditTarget(useComputed$(() => cmsPageEditTarget(pageLoader.value)));
  const page = pageLoader.value;
  const support = useServicesSupportingData();

  return (
    <HomepageSectionsRenderer
      sections={(page.sections || []) as PageSectionNode[]}
      uiLocale={uiLocale}
      services={shell.value.siteContent?.services ?? []}
      caseStudies={support.value.caseStudies}
      portfolioCategories={support.value.portfolioCategories}
      testimonials={support.value.testimonials}
      blogPosts={support.value.blogPosts}
      techStack={shell.value.siteContent?.techStack ?? []}
      branding={shell.value.branding}
      siteContact={shell.value.siteContent?.contact}
      layoutAware={true}
      allowDefaultSections={false}
      pageContext={{ title: page.title || 'Services', subtitle: page.subtitle ?? undefined, slug: page.slug }}
    />
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  let pageTitle = 'Services';
  let description =
    'Web development, Android, iOS, cross-platform, UI/UX design, and API/backend services.';
  let pageExcluded = false;
  try {
    const page = resolveValue(useServicesCmsPage) as PublicPageDetail;
    if (page && typeof page.title === 'string' && page.title.trim()) {
      pageTitle = page.title.trim();
      if (typeof page.excerpt === 'string' && page.excerpt.trim()) {
        description = page.excerpt.trim();
      }
    }
    pageExcluded = page?.exclude_from_search === true;
  } catch {
    /* loader unavailable during head — keep defaults */
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
