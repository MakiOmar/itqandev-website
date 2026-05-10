/**
 * Normalizes Laravel public `seo_meta` / admin `seoMetas[]` payload for marketing `<head>` and JSON-LD.
 */
import type { MarketingPublicSeoMeta } from './types';

/** Map snake_case API `seo_meta` object to camelCase snippet for frontend. */
export function mapMarketingSeoMetaFromApi(seoRaw: unknown): MarketingPublicSeoMeta | undefined {
  if (seoRaw == null || typeof seoRaw !== 'object' || Array.isArray(seoRaw)) {
    return undefined;
  }
  const o = seoRaw as Record<string, unknown>;
  const nonempty = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;

  const schema =
    'schema' in o && o.schema !== null && o.schema !== undefined ? o.schema : undefined;

  return {
    locale: nonempty(o.locale),
    metaTitle: nonempty(o.meta_title),
    metaDescription: nonempty(o.meta_description),
    canonicalUrl: nonempty(o.canonical_url),
    ogTitle: nonempty(o.og_title),
    ogDescription: nonempty(o.og_description),
    ogImage: nonempty(o.og_image),
    twitterCard: nonempty(o.twitter_card),
    schema,
  };
}
