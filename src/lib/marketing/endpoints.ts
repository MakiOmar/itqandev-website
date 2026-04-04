/**
 * Public API endpoints for marketing content.
 * Used when VITE_MARKETING_CONTENT_SOURCE=api and Laravel exposes these routes.
 */

/**
 * Paths are appended to VITE_MARKETING_API_URL / VITE_API_BASE_URL (usually ends with `/api`).
 */
export const MARKETING_ENDPOINTS = {
  /** GET list of published projects (public; supports ?featured=1&per_page=) */
  caseStudies: '/public/projects',
  /** GET single case study by id or slug */
  caseStudy: (idOrSlug: string | number) => `/public/projects/${idOrSlug}`,
  /** GET list of blog posts (public) */
  blogPosts: '/public/blog-posts',
  /** GET single blog post by id or slug */
  blogPost: (idOrSlug: string | number) => `/public/blog-posts/${idOrSlug}`,
  /** GET list of testimonials (public) */
  testimonials: '/public/testimonials',
  /** POST contact form submission */
  contact: '/contact',
  /** GET site content (services, pricing, FAQ, etc.) - optional */
  siteContent: '/public/site-content',
  /** GET branding + enabled UI locales for public header (no auth) */
  siteMeta: '/public/site-meta',
} as const;
