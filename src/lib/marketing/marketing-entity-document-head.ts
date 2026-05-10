import type { MarketingPublicSeoMeta } from './types';

/** Meta/link entries shared by marketing case study / service detail `<head>` (SSR). */
export function marketingEntityDetailHead(fields: {
  brandName: string;
  baseUrl: string;
  /** e.g. "Work", "Services" — appears in `<title>` and default canonical path naming. */
  sectionLabel: string;
  /** URL segment after base, e.g. `work`, `services` — no slashes. */
  sectionPath: string;
  slug: string;
  defaultTitle: string;
  defaultDescription: string;
  seo?: MarketingPublicSeoMeta | undefined;
}): { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; href: string }[] } {
  const seo = fields.seo;
  const docTitle = (seo?.metaTitle?.trim() || fields.defaultTitle).trim();
  const docDesc = (seo?.metaDescription?.trim() || fields.defaultDescription).trim();
  const ogTitle = (seo?.ogTitle?.trim() || docTitle).trim();
  const ogDesc = (seo?.ogDescription?.trim() || docDesc).trim();
  const defaultPath = `${fields.baseUrl.replace(/\/$/, '')}/${fields.sectionPath}/${fields.slug}`;
  const canonical = (seo?.canonicalUrl?.trim() || defaultPath).trim();
  const ogUrl = defaultPath;

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
