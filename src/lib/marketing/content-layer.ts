/**
 * Content layer: abstracts local JSON vs public API.
 * Switch via VITE_MARKETING_CONTENT_SOURCE=local|api (default: local).
 * Published projects are loaded from Laravel `/api/public/projects` when the API base URL is set.
 */

import type { CaseStudy, BlogPost, Testimonial, SiteContent, Service } from './types';
import { mapMarketingSeoMetaFromApi } from './seo-snippet';
import { getMarketingApiBaseUrl, marketingGet, type MarketingFetchContext } from './api-client';
import { MARKETING_ENDPOINTS } from './endpoints';

export type { MarketingFetchContext } from './api-client';

import caseStudiesData from '../../content/case-studies.json';
import testimonialsData from '../../content/testimonials.json';
import siteData from '../../content/site.json';
import blogData from '../../content/blog.json';

const contentSource = (import.meta.env?.VITE_MARKETING_CONTENT_SOURCE ?? 'local') as string;

function isDevSsrMarketingSkip(e: unknown): boolean {
  return e instanceof Error && e.message.includes('DEV_SSR_SKIP_MARKETING_API');
}

const caseStudies = caseStudiesData as CaseStudy[];
const testimonials = testimonialsData as Testimonial[];
const siteContent = siteData as SiteContent;
const blogPosts = blogData as BlogPost[];

function hasMarketingApiBase(fetchContext?: MarketingFetchContext): boolean {
  return getMarketingApiBaseUrl(fetchContext?.forwardDocumentUrl).trim().length > 0;
}

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

  const statusRaw = raw.status;
  const status =
    typeof statusRaw === 'string' && statusRaw.trim() !== ''
      ? statusRaw.trim()
      : undefined;

  const seoMeta = mapMarketingSeoMetaFromApi(raw.seo_meta);

  return {
    id: raw.id as string | number,
    slug: String(raw.slug ?? ''),
    status,
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
    seoMeta,
  };
}

async function fetchTestimonialsFromApi(
  locale?: string,
  fetchContext?: MarketingFetchContext,
): Promise<Testimonial[]> {
  if (!hasMarketingApiBase(fetchContext)) {
    return [];
  }
  try {
    const q = new URLSearchParams();
    q.set('per_page', '48');
    const path = `${MARKETING_ENDPOINTS.testimonials}?${q.toString()}`;
    const payload = await marketingGet<unknown>(path, locale, fetchContext);
    const list = unwrapMarketingListRecords(payload as Record<string, unknown>);
    return list
      .map((raw) => mapPublicTestimonialRecord(raw))
      .filter((t) => t.quote.length > 0 && t.approved !== false);
  } catch (e) {
    if (!isDevSsrMarketingSkip(e)) {
      console.warn('[marketing] fetch public testimonials failed', e);
    }
    return [];
  }
}

function mapPublicTestimonialRecord(raw: Record<string, unknown>): Testimonial {
  const quote =
    typeof raw.quote === 'string'
      ? raw.quote
      : typeof raw.content === 'string'
        ? raw.content
        : '';
  const authorName =
    typeof raw.authorName === 'string'
      ? raw.authorName
      : typeof raw.client_name === 'string'
        ? raw.client_name
        : '';
  const authorRole =
    typeof raw.authorRole === 'string'
      ? raw.authorRole
      : [raw.client_role, raw.company]
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean)
          .join(', ') || undefined;
  const projectTitle =
    typeof raw.projectTitle === 'string'
      ? raw.projectTitle
      : typeof raw.project_title === 'string'
        ? raw.project_title
        : undefined;
  const rating =
    typeof raw.rating === 'number'
      ? raw.rating
      : typeof raw.rating === 'string'
        ? Number.parseInt(raw.rating, 10)
        : undefined;

  return {
    id: (raw.id as string | number) ?? '',
    quote,
    authorName,
    authorRole: authorRole || undefined,
    authorAvatar:
      typeof raw.authorAvatar === 'string'
        ? raw.authorAvatar
        : typeof raw.author_avatar === 'string'
          ? raw.author_avatar
          : undefined,
    projectTitle: projectTitle || undefined,
    rating: Number.isFinite(rating as number) ? (rating as number) : undefined,
    approved: raw.approved !== false,
  };
}

async function fetchPublishedProjectsFromApi(
  options: {
    featured?: boolean;
    per_page: number;
    locale?: string;
    categorySlug?: string;
    skillSlug?: string;
  },
  fetchContext?: MarketingFetchContext,
): Promise<CaseStudy[]> {
  if (!hasMarketingApiBase(fetchContext)) {
    return [];
  }
  try {
    const q = new URLSearchParams();
    if (options.featured) {
      q.set('featured', '1');
    }
    q.set('per_page', String(options.per_page));
    if (options.categorySlug?.trim()) {
      q.set('category_slug', options.categorySlug.trim());
    }
    if (options.skillSlug?.trim()) {
      q.set('skill_slug', options.skillSlug.trim());
    }
    const path = `${MARKETING_ENDPOINTS.caseStudies}?${q.toString()}`;
    const payload = await marketingGet<unknown>(path, options.locale, fetchContext);
    const records = unwrapMarketingListRecords(payload);
    const mapped = records
      .map(mapPublicProjectToCaseStudy)
      .filter((c) => c.slug.length > 0);
    return mapped;
  } catch (e) {
    if (!isDevSsrMarketingSkip(e)) {
      console.warn('[marketing] fetch public projects failed', e);
    }
    return [];
  }
}

export type CaseStudyListFilters = {
  categorySlug?: string;
  skillSlug?: string;
};

/** Get all case studies (portfolio). Optional filters apply to API-backed lists only. */
export async function getCaseStudies(
  locale?: string,
  filters?: CaseStudyListFilters,
  fetchContext?: MarketingFetchContext,
): Promise<CaseStudy[]> {
  const live = await fetchPublishedProjectsFromApi(
    {
      per_page: 48,
      locale,
      categorySlug: filters?.categorySlug,
      skillSlug: filters?.skillSlug,
    },
    fetchContext,
  );
  if (live.length > 0) {
    return live;
  }
  if (hasMarketingApiBase(fetchContext)) {
    return [];
  }

  if (contentSource === 'api') {
    try {
      const q = new URLSearchParams();
      q.set('per_page', '48');
      if (filters?.categorySlug?.trim()) {
        q.set('category_slug', filters.categorySlug.trim());
      }
      if (filters?.skillSlug?.trim()) {
        q.set('skill_slug', filters.skillSlug.trim());
      }
      const data = await marketingGet<unknown>(
        `${MARKETING_ENDPOINTS.caseStudies}?${q.toString()}`,
        locale,
        fetchContext,
      );
      const list = unwrapMarketingListRecords(data);
      if (list.length > 0) {
        return list.map(mapPublicProjectToCaseStudy);
      }
    } catch {
      /* fall through */
    }
  }
  const local = caseStudies as CaseStudy[];
  if (!filters?.categorySlug?.trim() && !filters?.skillSlug?.trim()) {
    return Promise.resolve(local);
  }
  const cat = filters.categorySlug?.trim().toLowerCase();
  const sk = filters.skillSlug?.trim().toLowerCase();
  return Promise.resolve(
    local.filter((c) => {
      const cats = (c.categories ?? []).map((x) => String(x.slug ?? x.name ?? '').toLowerCase());
      const okCat = !cat || cats.includes(cat);
      const skills = c.skills ?? [];
      const skillSlugs = skills.map((x) => String(x.slug ?? x.name ?? '').toLowerCase());
      const okSkill = !sk || skillSlugs.includes(sk);
      return okCat && okSkill;
    }),
  );
}

/** Get a single case study by slug. */
export async function getCaseStudyBySlug(
  slug: string,
  locale?: string,
  fetchContext?: MarketingFetchContext,
): Promise<CaseStudy | null> {
  const hasApiBase = hasMarketingApiBase(fetchContext);
  if (hasApiBase) {
    try {
      const data = await marketingGet<unknown>(MARKETING_ENDPOINTS.caseStudy(slug), locale, fetchContext);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return mapPublicProjectToCaseStudy(data as Record<string, unknown>);
      }
    } catch {
      return null;
    }
    return null;
  }

  if (contentSource === 'api') {
    try {
      const data = await marketingGet<CaseStudy>(MARKETING_ENDPOINTS.caseStudy(slug), locale, fetchContext);
      return data ? normalizeCaseStudy(data) : null;
    } catch {
      return null;
    }
  }
  const found = caseStudies.find((c) => c.slug === slug) ?? null;
  return Promise.resolve(found);
}

/** Get featured case studies for home page. */
export async function getFeaturedCaseStudies(
  limit = 3,
  locale?: string,
  fetchContext?: MarketingFetchContext,
): Promise<CaseStudy[]> {
  const live = await fetchPublishedProjectsFromApi(
    { featured: true, per_page: limit, locale },
    fetchContext,
  );
  if (live.length > 0) {
    return live.slice(0, limit);
  }
  if (hasMarketingApiBase(fetchContext)) {
    const latest = await fetchPublishedProjectsFromApi(
      { per_page: limit, locale },
      fetchContext,
    );
    return latest.slice(0, limit);
  }

  const all = await getCaseStudies(locale, undefined, fetchContext);
  const featured = all.filter((c) => c.featured).slice(0, limit);
  if (featured.length >= limit) {
    return featured;
  }
  return all.slice(0, limit);
}

/** Get approved testimonials (from API when configured, else local JSON). Respects locale via X-Content-Locale when using the API. */
export async function getTestimonials(
  locale?: string,
  fetchContext?: MarketingFetchContext,
): Promise<Testimonial[]> {
  const live = await fetchTestimonialsFromApi(locale, fetchContext);
  if (live.length > 0) {
    return live;
  }
  if (hasMarketingApiBase(fetchContext)) {
    return [];
  }

  if (contentSource === 'api') {
    try {
      const q = new URLSearchParams();
      q.set('per_page', '48');
      const path = `${MARKETING_ENDPOINTS.testimonials}?${q.toString()}`;
      const payload = await marketingGet<unknown>(path, locale, fetchContext);
      const list = unwrapMarketingListRecords(payload as Record<string, unknown>)
        .map((raw) => mapPublicTestimonialRecord(raw))
        .filter((t) => t.quote.length > 0 && t.approved !== false);
      if (list.length > 0) {
        return list;
      }
    } catch {
      /* fall through */
    }
  }
  return Promise.resolve(testimonials.filter((t) => t.approved !== false));
}

function normalizeServiceFromPublicApi(raw: Record<string, unknown>): Service {
  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? ''),
    shortDescription: String(raw.shortDescription ?? raw.short_description ?? ''),
    description: String(raw.description ?? ''),
    process: Array.isArray(raw.process) ? (raw.process as string[]) : undefined,
    deliverables: Array.isArray(raw.deliverables) ? (raw.deliverables as string[]) : undefined,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    seoMeta: mapMarketingSeoMetaFromApi(raw.seo_meta),
  };
}

/**
 * Get site content (services, pricing, FAQ, contact, about).
 * When `VITE_MARKETING_API_URL` / `VITE_API_BASE_URL` is set, merges `GET /public/services` (optional `locale` → X-Content-Locale) over local `site.json` for the `services` array only.
 */
export async function getSiteContent(
  locale?: string | null,
  fetchContext?: MarketingFetchContext,
): Promise<SiteContent> {
  let merged: SiteContent = siteContent;

  if (contentSource === 'api') {
    try {
      const data = await marketingGet<SiteContent>(
        MARKETING_ENDPOINTS.siteContent,
        locale ?? undefined,
        fetchContext,
      );
      if (data) {
        merged = { ...merged, ...data };
      }
    } catch {
      /* keep merged from local */
    }
  }

  if (hasMarketingApiBase(fetchContext)) {
    try {
      const payload = await marketingGet<unknown>(
        MARKETING_ENDPOINTS.services,
        locale ?? undefined,
        fetchContext,
      );
      const arr = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : [];
      if (arr.length > 0) {
        merged = {
          ...merged,
          services: arr
            .filter((row) => row && typeof row === 'object')
            .map((row) => normalizeServiceFromPublicApi(row as Record<string, unknown>)),
        };
      }
    } catch (e) {
      if (!isDevSsrMarketingSkip(e)) {
        console.warn('[marketing] fetch public services failed', e);
      }
    }
  }

  return Promise.resolve(merged);
}

/** Single published service by slug (uses merged site content + public services when configured). */
export async function getServiceBySlug(slug: string, locale?: string | null): Promise<Service | null> {
  const content = await getSiteContent(locale);
  const found = content.services.find((s) => s.slug === slug) ?? null;
  return found;
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
    status: raw.status,
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    image: image || undefined,
    imageAlt: raw.imageAlt,
    tags: raw.tags,
    skills: raw.skills,
    categories: raw.categories,
    linkUrl: raw.linkUrl,
    demoUrl: raw.demoUrl,
    repoUrl: raw.repoUrl,
    featured: raw.featured,
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    seoMeta: raw.seoMeta,
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
