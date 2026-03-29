/**
 * Content layer: abstracts local JSON vs public API.
 * Switch via VITE_MARKETING_CONTENT_SOURCE=local|api (default: local).
 * Published projects are loaded from Laravel `/api/public/projects` when the API base URL is set.
 */

import type { CaseStudy, BlogPost, Testimonial, SiteContent } from './types';
import { getMarketingApiBaseUrl, marketingGet } from './api-client';
import { MARKETING_ENDPOINTS } from './endpoints';

import caseStudiesData from '../../content/case-studies.json';
import testimonialsData from '../../content/testimonials.json';
import siteData from '../../content/site.json';
import blogData from '../../content/blog.json';

const contentSource = (import.meta.env?.VITE_MARKETING_CONTENT_SOURCE ?? 'local') as string;

const caseStudies = caseStudiesData as CaseStudy[];
const testimonials = testimonialsData as Testimonial[];
const siteContent = siteData as SiteContent;
const blogPosts = blogData as BlogPost[];

function unwrapMarketingListRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

function mapPublicProjectToCaseStudy(raw: Record<string, unknown>): CaseStudy {
  const tags = Array.isArray(raw.tags)
    ? (raw.tags as unknown[]).map((t) => String(t)).filter(Boolean)
    : [];
  const image =
    typeof raw.image === 'string' && raw.image.trim() ? raw.image.trim() : undefined;
  const imageAlt =
    typeof raw.image_alt === 'string'
      ? raw.image_alt
      : typeof raw.imageAlt === 'string'
        ? raw.imageAlt
        : undefined;

  return {
    id: raw.id as string | number,
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
    summary: String(raw.summary ?? ''),
    description: raw.description != null ? String(raw.description) : undefined,
    image,
    imageAlt,
    tags,
    featured: Boolean(raw.featured),
    publishedAt:
      typeof raw.published_at === 'string'
        ? raw.published_at
        : typeof raw.publishedAt === 'string'
          ? raw.publishedAt
          : undefined,
  };
}

async function fetchPublishedProjectsFromApi(options: {
  featured?: boolean;
  per_page: number;
  locale?: string;
}): Promise<CaseStudy[]> {
  if (!getMarketingApiBaseUrl().trim()) {
    return [];
  }
  try {
    const q = new URLSearchParams();
    if (options.featured) {
      q.set('featured', '1');
    }
    q.set('per_page', String(options.per_page));
    const path = `${MARKETING_ENDPOINTS.caseStudies}?${q.toString()}`;
    const payload = await marketingGet<unknown>(path, options.locale);
    return unwrapMarketingListRecords(payload)
      .map(mapPublicProjectToCaseStudy)
      .filter((c) => c.slug.length > 0);
  } catch (e) {
    console.warn('[marketing] fetch public projects failed', e);
    return [];
  }
}

/** Get all case studies (portfolio). */
export async function getCaseStudies(locale?: string): Promise<CaseStudy[]> {
  const live = await fetchPublishedProjectsFromApi({ per_page: 48, locale });
  if (live.length > 0) {
    return live;
  }

  if (contentSource === 'api') {
    try {
      const data = await marketingGet<unknown>(
        `${MARKETING_ENDPOINTS.caseStudies}?per_page=48`,
        locale,
      );
      const list = unwrapMarketingListRecords(data);
      if (list.length > 0) {
        return list.map(mapPublicProjectToCaseStudy);
      }
    } catch {
      /* fall through */
    }
  }
  return Promise.resolve(caseStudies);
}

/** Get a single case study by slug. */
export async function getCaseStudyBySlug(slug: string, locale?: string): Promise<CaseStudy | null> {
  if (getMarketingApiBaseUrl().trim()) {
    try {
      const data = await marketingGet<unknown>(MARKETING_ENDPOINTS.caseStudy(slug), locale);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return mapPublicProjectToCaseStudy(data as Record<string, unknown>);
      }
    } catch {
      /* fall through */
    }
  }

  if (contentSource === 'api') {
    try {
      const data = await marketingGet<CaseStudy>(MARKETING_ENDPOINTS.caseStudy(slug), locale);
      return data ? normalizeCaseStudy(data) : null;
    } catch {
      return null;
    }
  }
  const found = caseStudies.find((c) => c.slug === slug) ?? null;
  return Promise.resolve(found);
}

/** Get featured case studies for home page. */
export async function getFeaturedCaseStudies(limit = 3, locale?: string): Promise<CaseStudy[]> {
  const live = await fetchPublishedProjectsFromApi({ featured: true, per_page: limit, locale });
  if (live.length > 0) {
    return live.slice(0, limit);
  }

  const all = await getCaseStudies(locale);
  const featured = all.filter((c) => c.featured).slice(0, limit);
  if (featured.length >= limit) {
    return featured;
  }
  return all.slice(0, limit);
}

/** Get all testimonials. */
export async function getTestimonials(): Promise<Testimonial[]> {
  if (contentSource === 'api') {
    const data = await marketingGet<{ data?: Testimonial[] }>(MARKETING_ENDPOINTS.testimonials);
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list.filter((t) => t.approved !== false);
  }
  return Promise.resolve(testimonials.filter((t) => t.approved !== false));
}

/** Get site content (services, pricing, FAQ, contact, about). */
export async function getSiteContent(): Promise<SiteContent> {
  if (contentSource === 'api') {
    try {
      const data = await marketingGet<SiteContent>(MARKETING_ENDPOINTS.siteContent);
      return data ?? siteContent;
    } catch {
      return siteContent;
    }
  }
  return Promise.resolve(siteContent);
}

/** Get all blog posts (sorted by date desc). */
export async function getBlogPosts(): Promise<BlogPost[]> {
  if (contentSource === 'api') {
    const data = await marketingGet<{ data?: BlogPost[] }>(MARKETING_ENDPOINTS.blogPosts);
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list.map(normalizeBlogPost).sort((a, b) => (b.date > a.date ? 1 : -1));
  }
  const sorted = [...blogPosts].sort((a, b) => (b.date > a.date ? 1 : -1));
  return Promise.resolve(sorted);
}

/** Get a single blog post by slug. */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (contentSource === 'api') {
    try {
      const data = await marketingGet<BlogPost>(MARKETING_ENDPOINTS.blogPost(slug));
      return data ? normalizeBlogPost(data) : null;
    } catch {
      return null;
    }
  }
  const found = blogPosts.find((p) => p.slug === slug) ?? null;
  return Promise.resolve(found);
}

function normalizeCaseStudy(raw: CaseStudy): CaseStudy {
  const image = raw.image?.trim();
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    image: image || undefined,
    imageAlt: raw.imageAlt,
    tags: raw.tags,
    categories: raw.categories,
    linkUrl: raw.linkUrl,
    demoUrl: raw.demoUrl,
    repoUrl: raw.repoUrl,
    featured: raw.featured,
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeBlogPost(raw: BlogPost): BlogPost {
  const cover =
    raw.coverImage === undefined || raw.coverImage === null ? undefined : raw.coverImage.trim();
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    body: raw.body,
    date: raw.date,
    author: raw.author,
    coverImage: cover,
    coverImageAlt: raw.coverImageAlt,
    seoMeta: raw.seoMeta,
  };
}
