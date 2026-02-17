import type { RequestHandler } from '@builder.io/qwik-city';
import { getCaseStudies } from '../../lib/marketing/content-layer';
import { getBlogPosts } from '../../lib/marketing/content-layer';

const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const onGet: RequestHandler = async ({ send }) => {
  const [caseStudies, blogPosts] = await Promise.all([
    getCaseStudies(),
    getBlogPosts(),
  ]);

  const staticPaths = [
    { loc: '/', priority: '1.0' },
    { loc: '/services', priority: '0.9' },
    { loc: '/work', priority: '0.9' },
    { loc: '/about', priority: '0.8' },
    { loc: '/pricing', priority: '0.8' },
    { loc: '/contact', priority: '0.8' },
    { loc: '/blog', priority: '0.9' },
  ];

  const workUrls = caseStudies.map((c) => ({
    loc: `/work/${escapeXml(c.slug)}`,
    priority: '0.8',
  }));

  const blogUrls = blogPosts.map((p) => ({
    loc: `/blog/${escapeXml(p.slug)}`,
    priority: '0.7',
  }));

  const urls = [...staticPaths, ...workUrls, ...blogUrls];
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
