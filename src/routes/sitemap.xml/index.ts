import type { RequestHandler } from '@builder.io/qwik-city';
import { getCaseStudies } from '../../lib/marketing/content-layer';
import { getBlogPosts } from '../../lib/marketing/content-layer';
import { getPublicSiteBaseUrl } from '../../lib/seo/canonical-url';
import { marketingGet } from '../../lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '../../lib/marketing/endpoints';

const baseUrl = getPublicSiteBaseUrl();

const PRETTY_PAGE_PATHS = new Set([
  '/services',
  '/portfolio',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
]);

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

async function getCmsPagesForSitemap(): Promise<{ loc: string; priority: string }[]> {
  try {
    const data = await marketingGet<unknown>(MARKETING_ENDPOINTS.pages);
    return unwrapList(data)
      .map((row) => {
        const publicPath = String(row.public_path ?? '').replace(/\/+$/, '') || '';
        if (publicPath && PRETTY_PAGE_PATHS.has(publicPath)) {
          return null;
        }
        const nested = String(row.path || row.slug || '')
          .replace(/^\/+|\/+$/g, '');
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

export const onGet: RequestHandler = async ({ send }) => {
  const [caseStudies, blogPosts, cmsPages] = await Promise.all([
    getCaseStudies(),
    getBlogPosts(),
    getCmsPagesForSitemap(),
  ]);

  const staticPaths = [
    { loc: '/', priority: '1.0' },
    { loc: '/services', priority: '0.9' },
    { loc: '/portfolio', priority: '0.9' },
    { loc: '/about', priority: '0.8' },
    { loc: '/pricing', priority: '0.8' },
    { loc: '/contact', priority: '0.8' },
    { loc: '/blog', priority: '0.9' },
  ];

  const portfolioUrls = caseStudies.map((c) => ({
    loc: `/portfolio/${escapeXml(c.slug)}`,
    priority: '0.8',
  }));

  const blogUrls = blogPosts.map((p) => ({
    loc: `/blog/${escapeXml(p.slug)}`,
    priority: '0.7',
  }));

  const urls = [...staticPaths, ...portfolioUrls, ...blogUrls, ...cmsPages];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escapeXml(baseUrl)}${u.loc.startsWith('/') ? u.loc : '/' + u.loc}</loc><priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;

  const response = new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
  send(response);
};
