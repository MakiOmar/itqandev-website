/**
 * Marketing site route and segment constants.
 */

import { withUiLocale } from '../i18n/ui-locale-path';

/** Paths use trailing slashes so they match Qwik City default `trailingSlash: true` (avoids broken client navigations). */
export const MARKETING_ROUTES = {
  home: '/',
  services: '/services/',
  serviceSlug: (slug: string) => `/services/${slug}/`,
  portfolio: '/portfolio/',
  portfolioSlug: (slug: string) => `/portfolio/${slug}/`,
  /** @deprecated Use `portfolio` */
  work: '/portfolio/',
  /** @deprecated Use `portfolioSlug` */
  workSlug: (slug: string) => `/portfolio/${slug}/`,
  about: '/about/',
  pricing: '/pricing/',
  contact: '/contact/',
  blog: '/blog/',
  blogSlug: (slug: string) => `/blog/${slug}/`,
} as const;

/** Locale-prefixed marketing paths (`/en/services`, `/fr/blog/...`). */
export function marketingRoutes(lang: string) {
  return {
    home: withUiLocale(lang, MARKETING_ROUTES.home),
    services: withUiLocale(lang, MARKETING_ROUTES.services),
    serviceSlug: (slug: string) => withUiLocale(lang, MARKETING_ROUTES.serviceSlug(slug)),
    portfolio: withUiLocale(lang, MARKETING_ROUTES.portfolio),
    portfolioSlug: (slug: string) => withUiLocale(lang, MARKETING_ROUTES.portfolioSlug(slug)),
    /** @deprecated Use `portfolio` */
    work: withUiLocale(lang, MARKETING_ROUTES.portfolio),
    /** @deprecated Use `portfolioSlug` */
    workSlug: (slug: string) => withUiLocale(lang, MARKETING_ROUTES.portfolioSlug(slug)),
    about: withUiLocale(lang, MARKETING_ROUTES.about),
    pricing: withUiLocale(lang, MARKETING_ROUTES.pricing),
    contact: withUiLocale(lang, MARKETING_ROUTES.contact),
    blog: withUiLocale(lang, MARKETING_ROUTES.blog),
    blogSlug: (slug: string) => withUiLocale(lang, MARKETING_ROUTES.blogSlug(slug)),
  } as const;
}

export const SERVICE_SLUGS = [
  'web',
  'android',
  'ios',
  'cross-platform',
  'ui-ux',
  'api-backend',
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];
