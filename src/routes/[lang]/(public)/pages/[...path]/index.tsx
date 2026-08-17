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

function restPathParam(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw
      .map((part) => decodeURIComponent(String(part)))
      .map((part) => part.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  }
  return decodeURIComponent(String(raw ?? ''))
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function leafSlug(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function urlMatchesPage(urlPath: string, page: PublicPageDetail): boolean {
  const url = urlPath.replace(/^\/+|\/+$/g, '');
  const nested = String(page.path || page.slug || '')
    .replace(/^\/+|\/+$/g, '');
  const slug = String(page.slug || '').replace(/^\/+|\/+$/g, '');
  return url === nested || url === slug;
}

export const usePublicPageDetail = routeLoader$(async ({ params, request, fail, url }) => {
  const fromParams = restPathParam(
    (params as { path?: unknown; slug?: unknown }).path ?? (params as { slug?: unknown }).slug,
  );
  const fromUrl = (() => {
    try {
      const pathName = (url?.pathname || new URL(request.url).pathname).replace(/\/+$/, '');
      const marker = '/pages/';
      const idx = pathName.lastIndexOf(marker) >= 0 ? pathName.indexOf(marker) : -1;
      if (idx < 0) {
        return '';
      }
      return decodeURIComponent(pathName.slice(idx + marker.length)).replace(/^\/+|\/+$/g, '');
    } catch {
      return '';
    }
  })();
  const urlPath = fromParams || fromUrl;
  const slug = leafSlug(urlPath);
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
    let page: PublicPageDetail | null = null;
    if (json && typeof json === 'object' && Array.isArray(json.sections)) {
      page = json;
    } else if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
      page = json.data as PublicPageDetail;
    } else {
      page = json as PublicPageDetail;
    }
    if (!page || typeof page.slug !== 'string') {
      return fail(404, { message: 'Page not found' });
    }
    if (!urlMatchesPage(urlPath, page)) {
      return fail(404, { message: 'Page not found' });
    }
    return page;
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
      siteContact={shell.value.siteContent?.contact}
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
    const result = marketingEntityDetailHead({
      brandName,
      baseUrl: getPublicSiteBaseUrl(url.origin).replace(/\/$/, ''),
      sectionLabel: 'Pages',
      pageUrl: url,
      defaultTitle: page.title,
      defaultDescription: page.excerpt || page.title,
      seo: mapMarketingSeoMetaFromApi(page.seo_meta),
      robots: page.exclude_from_search ? 'noindex, nofollow' : undefined,
    });
    return result;
  } catch {
    return { title: 'Page' };
  }
};
