/**
 * Marketing site route and segment constants.
 */

export const MARKETING_ROUTES = {
  home: '/',
  services: '/services',
  work: '/work',
  workSlug: (slug: string) => `/work/${slug}`,
  about: '/about',
  pricing: '/pricing',
  contact: '/contact',
  blog: '/blog',
  blogSlug: (slug: string) => `/blog/${slug}`,
} as const;

export const SERVICE_SLUGS = [
  'web',
  'android',
  'ios',
  'cross-platform',
  'ui-ux',
  'api-backend',
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];
