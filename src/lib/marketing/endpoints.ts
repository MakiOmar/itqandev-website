/**
 * Public API endpoints for marketing content.
 * Used when VITE_MARKETING_CONTENT_SOURCE=api and Laravel exposes these routes.
 */

export const MARKETING_ENDPOINTS = {
  /** GET list of case studies / projects (public) */
  caseStudies: '/api/public/projects',
  /** GET single case study by id or slug */
  caseStudy: (idOrSlug: string | number) => `/api/public/projects/${idOrSlug}`,
  /** GET list of blog posts (public) */
  blogPosts: '/api/public/blog-posts',
  /** GET single blog post by id or slug */
  blogPost: (idOrSlug: string | number) => `/api/public/blog-posts/${idOrSlug}`,
  /** GET list of testimonials (public) */
  testimonials: '/api/public/testimonials',
  /** POST contact form submission */
  contact: '/api/contact',
  /** GET site content (services, pricing, FAQ, etc.) - optional */
  siteContent: '/api/public/site-content',
} as const;
