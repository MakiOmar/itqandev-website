import type { RequestHandler } from '@builder.io/qwik-city';
import { getCaseStudies } from '../../lib/marketing/content-layer';
import { getBlogPosts } from '../../lib/marketing/content-layer';
import { getPublicSiteBaseUrl } from '../../lib/seo/canonical-url';
import { marketingGet } from '../../lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '../../lib/marketing/endpoints';
import { isSearchEngineIndexingEnabled } from '../../lib/seo/search-engine-indexing';
import { resolvePublicSiteLanguages } from '../../lib/i18n/public-site-languages';
import { withUiLocale } from '../../lib/i18n/ui-locale-path';
import { supportedUiLocaleCodes } from '../../lib/i18n/ui-locale-segments';

const baseUrl = getPublicSiteBaseUrl();

const PRETTY_PAGE_PATHS = new Set([
  '/services',
  '/portfolio',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
]);

/** Pretty marketing URLs backed by a CMS page slug (`exclude_from_search` is on the show payload). */
const PRETTY_PATH_CMS_SLUG: Record<string, string> = {
  '/services': 'services',
  '/portfolio': 'portfolio',
  '/about': 'about',
  '/pricing': 'pricing',
  '/contact': 'contact',
  '/blog': 'articles',
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unwrapList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

/** Logical path → trailing-slash form matching Qwik City `trailingSlash: true`. */
function withTrailingSlash(path: string): string {
  const raw = path.startsWith('/') ? path : `/${path}`;
  if (raw === '/') {
    return '/';
  }
  return `${raw.replace(/\/+$/, '')}/`;
}

/** Expand one logical (unprefixed) path into absolute locale-prefixed locs. */
function expandLocaleLocs(logicalPath: string, locales: readonly string[]): string[] {
  const normalized = withTrailingSlash(logicalPath);
  return locales.map((lang) => withUiLocale(lang, normalized));
}

async function fetchSiteMeta(): Promise<{
  allowIndexing: boolean;
  locales: string[];
}> {
  try {
    const data = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta);
    const languages = resolvePublicSiteLanguages(data?.site_languages);
    const locales =
      languages.length > 0
        ? languages.map((l) => l.code)
        : supportedUiLocaleCodes();
    return {
      allowIndexing: isSearchEngineIndexingEnabled(data?.search_engine_indexing),
      locales,
    };
  } catch {
    return {
      allowIndexing: true,
      locales: supportedUiLocaleCodes(),
    };
  }
}

async function prettyPathIsExcluded(path: string): Promise<boolean> {
  const slug = PRETTY_PATH_CMS_SLUG[path];
  if (!slug) {
    return false;
  }
  try {
    const data = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.page(slug));
    return data?.exclude_from_search === true;
  } catch {
    return false;
  }
}

async function getCmsPagesForSitemap(): Promise<{ loc: string; priority: string }[]> {
  try {
    const data = await marketingGet<unknown>(MARKETING_ENDPOINTS.pages);
    return unwrapList(data)
      .map((row) => {
        const publicPath = String(row.public_path ?? '').replace(/\/+$/, '') || '';
        if (!publicPath || publicPath === '/' || PRETTY_PAGE_PATHS.has(publicPath)) {
          return null;
        }
        const nested = String(row.path || row.slug || '').replace(/^\/+|\/+$/g, '');
        if (!nested) {
          return null;
        }
        return { loc: `/pages/${nested}`, priority: '0.6' };
      })
      .filter((row): row is { loc: string; priority: string } => row !== null);
  } catch {
    return [];
  }
}

/** Published singles of enabled addon content types (`/{prefix}/{slug}/`). */
async function getAddonContentPathsForSitemap(): Promise<string[]> {
  try {
    const data = await marketingGet<unknown>(MARKETING_ENDPOINTS.contentSitemap);
    return Array.isArray(data)
      ? data.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
      : [];
  } catch {
    return [];
  }
}

function sitemapXml(urls: Array<{ loc: string; priority: string }>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escapeXml(baseUrl)}${u.loc.startsWith('/') ? u.loc : '/' + u.loc}</loc><priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`;
}

export const onGet: RequestHandler = async ({ send }) => {
  const { allowIndexing, locales } = await fetchSiteMeta();
  if (!allowIndexing) {
    send(
      new Response(sitemapXml([]), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      }),
    );
    return;
  }

  const staticCandidates = [
    { loc: '/', priority: '1.0' },
    { loc: '/services', priority: '0.9' },
    { loc: '/portfolio', priority: '0.9' },
    { loc: '/about', priority: '0.8' },
    { loc: '/pricing', priority: '0.8' },
    { loc: '/contact', priority: '0.8' },
    { loc: '/blog', priority: '0.9' },
  ];

  const [caseStudies, blogPosts, cmsPages, contentPaths, excludedPretty] = await Promise.all([
    getCaseStudies(),
    getBlogPosts(),
    getCmsPagesForSitemap(),
    getAddonContentPathsForSitemap(),
    Promise.all(
      staticCandidates.map(async (row) =>
        row.loc === '/' ? false : prettyPathIsExcluded(row.loc),
      ),
    ),
  ]);

  const staticPaths = staticCandidates.filter((_, i) => !excludedPretty[i]);

  const logicalRows: Array<{ loc: string; priority: string }> = [
    ...staticPaths,
    ...caseStudies.map((c) => ({
      loc: `/portfolio/${c.slug}`,
      priority: '0.8',
    })),
    ...blogPosts.map((p) => ({
      loc: `/blog/${p.slug}`,
      priority: '0.7',
    })),
    ...cmsPages,
  ];

  const emitted = new Set(logicalRows.map((u) => withTrailingSlash(u.loc).replace(/\/+$/, '') || '/'));
  for (const path of contentPaths) {
    const loc = withTrailingSlash(path);
    const key = loc.replace(/\/+$/, '') || '/';
    if (key && !emitted.has(key)) {
      emitted.add(key);
      logicalRows.push({ loc: path, priority: '0.7' });
    }
  }

  const urls: Array<{ loc: string; priority: string }> = [];
  const emittedLocale = new Set<string>();
  for (const row of logicalRows) {
    for (const loc of expandLocaleLocs(row.loc, locales)) {
      if (emittedLocale.has(loc)) {
        continue;
      }
      emittedLocale.add(loc);
      // Slugs are already URL-safe from the API; escape only for XML text.
      urls.push({ loc: escapeXml(loc), priority: row.priority });
    }
  }

  send(
    new Response(sitemapXml(urls), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    }),
  );
};
