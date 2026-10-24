import { buildCanonicalHref, canonicalQuerySuffix, resolveAbsoluteCanonicalUrl } from '~/lib/seo/canonical-url';
import {
  applyTitleTemplate,
  resolveSeoDefaults,
  type SeoDefaults,
  type SeoDefaultsType,
} from '~/lib/seo/seo-defaults';
import type { MarketingPublicSeoMeta } from './types';

/** Meta/link entries shared by marketing detail `<head>` (SSR): item SEO → content → type → global defaults. */
export function marketingEntityDetailHead(fields: {
  brandName: string;
  baseUrl: string;
  /** e.g. "Work", "Services" — the `{section}` token of the title template. */
  sectionLabel: string;
  /** Current request URL — canonical / og:url are self-referential to the served 200 page. */
  pageUrl: URL;
  defaultTitle: string;
  /** Content fallback (excerpt / summary); empty falls through to the SEO defaults. */
  defaultDescription: string;
  /** Content image (featured / hero) used before the default OG image. */
  defaultImage?: string;
  seo?: MarketingPublicSeoMeta | undefined;
  /** Settings → SEO defaults from the public shell branding. */
  seoDefaults?: SeoDefaults | null;
  /** Content type whose defaults override the global ones; null uses global only. */
  typeKey?: SeoDefaultsType | null;
  /** Last description fallback (Settings → General site description). */
  siteDescription?: string;
  /** When set (e.g. exclude-from-search pages), emit robots meta. */
  robots?: string;
  /** Query keys kept in the self canonical (listing filters); everything else is dropped. */
  canonicalQuery?: readonly string[];
}): { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; href: string }[] } {
  const seo = fields.seo;
  const defaults = resolveSeoDefaults(fields.seoDefaults, fields.typeKey ?? null);
  const docTitle = (seo?.metaTitle?.trim() || fields.defaultTitle).trim();
  const docDesc = (
    seo?.metaDescription?.trim() ||
    fields.defaultDescription.trim() ||
    defaults.description ||
    fields.siteDescription?.trim() ||
    ''
  ).trim();
  const ogTitle = (seo?.ogTitle?.trim() || docTitle).trim();
  const ogDesc = (seo?.ogDescription?.trim() || docDesc).trim();
  // Self-referential canonical pointing at the actual locale-prefixed 200 URL; CMS value overrides.
  const selfUrl =
    buildCanonicalHref(fields.pageUrl.pathname, fields.pageUrl.origin) +
    canonicalQuerySuffix(fields.pageUrl.searchParams, fields.canonicalQuery);
  const canonical = resolveAbsoluteCanonicalUrl(
    (seo?.canonicalUrl?.trim() || selfUrl).trim(),
    fields.baseUrl,
  );
  const ogUrl = selfUrl;

  const meta: { name?: string; property?: string; content: string }[] = [];
  if (docDesc) {
    meta.push({ name: 'description', content: docDesc });
  }
  meta.push({ property: 'og:title', content: ogTitle });
  if (ogDesc) {
    meta.push({ property: 'og:description', content: ogDesc });
  }
  meta.push({ property: 'og:url', content: ogUrl });
  const ogImg = seo?.ogImage?.trim() || fields.defaultImage?.trim() || defaults.ogImage;
  if (ogImg) {
    meta.push({ property: 'og:image', content: ogImg });
  }

  const twitterCard =
    seo?.twitterCard?.trim() ||
    defaults.twitterCard ||
    (ogImg ? 'summary_large_image' : 'summary');
  meta.push({ name: 'twitter:card', content: twitterCard });
  meta.push({ name: 'twitter:title', content: ogTitle });
  if (ogDesc) {
    meta.push({ name: 'twitter:description', content: ogDesc });
  }
  if (ogImg) {
    meta.push({ name: 'twitter:image', content: ogImg });
  }
  if (fields.robots?.trim()) {
    meta.push({ name: 'robots', content: fields.robots.trim() });
  }

  return {
    title: applyTitleTemplate(defaults.titleTemplate, {
      title: docTitle,
      section: fields.sectionLabel,
      site: fields.brandName,
    }),
    meta,
    links: [{ rel: 'canonical', href: canonical }],
  };
}
