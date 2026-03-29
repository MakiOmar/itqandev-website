/**
 * Content layer: abstracts local JSON vs public API.
 * Switch via VITE_MARKETING_CONTENT_SOURCE=local|api (default: local).
 */

import type { CaseStudy, BlogPost, Testimonial, SiteContent } from './types';
import { marketingGet } from './api-client';
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

/** Get all case studies (portfolio). */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  if (contentSource === 'api') {
    const data = await marketingGet<{ data?: CaseStudy[] }>(MARKETING_ENDPOINTS.caseStudies);
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list.map(normalizeCaseStudy);
  }
  return Promise.resolve(caseStudies);
}

/** Get a single case study by slug. */
export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  if (contentSource === 'api') {
    try {
      const data = await marketingGet<CaseStudy>(MARKETING_ENDPOINTS.caseStudy(slug));
      return data ? normalizeCaseStudy(data) : null;
    } catch {
      return null;
    }
  }
  const found = caseStudies.find((c) => c.slug === slug) ?? null;
  return Promise.resolve(found);
}

/** Get featured case studies for home page. */
export async function getFeaturedCaseStudies(limit = 3): Promise<CaseStudy[]> {
  const all = await getCaseStudies();
  const featured = all.filter((c) => c.featured).slice(0, limit);
  if (featured.length >= limit) return featured;
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
