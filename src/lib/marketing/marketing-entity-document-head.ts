import { buildCanonicalHref, resolveAbsoluteCanonicalUrl } from '~/lib/seo/canonical-url';
import type { MarketingPublicSeoMeta } from './types';

/** Meta/link entries shared by marketing case study / service detail `<head>` (SSR). */
export function marketingEntityDetailHead(fields: {
  brandName: string;
  baseUrl: string;
  /** e.g. "Work", "Services" — appears in `<title>`. */
  sectionLabel: string;
  /** Current request URL — canonical / og:url are self-referential to the served 200 page. */
  pageUrl: URL;
  defaultTitle: string;
  defaultDescription: string;
  seo?: MarketingPublicSeoMeta | undefined;
}): { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; href: string }[] } {
  const seo = fields.seo;
  const docTitle = (seo?.metaTitle?.trim() || fields.defaultTitle).trim();
  const docDesc = (seo?.metaDescription?.trim() || fields.defaultDescription).trim();
  const ogTitle = (seo?.ogTitle?.trim() || docTitle).trim();
  const ogDesc = (seo?.ogDescription?.trim() || docDesc).trim();
  // Self-referential canonical pointing at the actual locale-prefixed 200 URL; CMS value overrides.
  const selfUrl = buildCanonicalHref(fields.pageUrl.pathname, fields.pageUrl.origin);
  const canonical = resolveAbsoluteCanonicalUrl(
    (seo?.canonicalUrl?.trim() || selfUrl).trim(),
    fields.baseUrl,
  );
  const ogUrl = selfUrl;

  const meta: { name?: string; property?: string; content: string }[] = [
    { name: 'description', content: docDesc },
    { property: 'og:title', content: ogTitle },
    { property: 'og:description', content: ogDesc },
    { property: 'og:url', content: ogUrl },
  ];
  const ogImg = seo?.ogImage?.trim();
  if (ogImg) {
    meta.push({ property: 'og:image', content: ogImg });
  }

  const twitterCard =
    seo?.twitterCard?.trim() ||
    (ogImg ? 'summary_large_image' : 'summary');
  meta.push({ name: 'twitter:card', content: twitterCard });
  meta.push({ name: 'twitter:title', content: ogTitle });
  meta.push({ name: 'twitter:description', content: ogDesc });
  if (ogImg) {
    meta.push({ name: 'twitter:image', content: ogImg });
  }

  return {
    title: `${docTitle} | ${fields.sectionLabel} | ${fields.brandName}`,
    meta,
    links: [{ rel: 'canonical', href: canonical }],
  };
}
