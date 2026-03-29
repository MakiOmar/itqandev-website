import { publicMarketingAssetUrl } from '~/lib/marketing/public-asset-url';

/** Default when CMS/API omits or empties an image (see website/public/placeholder.webp). */
export const MARKETING_PLACEHOLDER_WEBP = '/placeholder.webp';

export function marketingPlaceholderAbsoluteUrl(): string {
  return publicMarketingAssetUrl(MARKETING_PLACEHOLDER_WEBP);
}

/**
 * Resolved URL for case study / blog / testimonial images.
 * Missing or whitespace → placeholder. Remote URLs unchanged.
 */
export function resolveContentImageUrl(src: string | null | undefined): string {
  const s = src?.trim();
  if (!s) return marketingPlaceholderAbsoluteUrl();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return s;
  return publicMarketingAssetUrl(s.startsWith('/') ? s : `/${s}`);
}
