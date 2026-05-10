/**
 * Marketing site content types.
 * Backend-agnostic interfaces so we can switch between local content and API.
 */

export interface CaseStudy {
  id: string | number;
  slug: string;
  /** Laravel project status when loaded from API (e.g. draft for staff preview). */
  status?: string;
  title: string;
  summary: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  tags?: string[];
  categories?: { id: number; name: string; slug?: string }[];
  skills?: { id: number; name: string; slug?: string }[];
  linkUrl?: string;
  demoUrl?: string;
  repoUrl?: string;
  featured?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** From public API `seo_meta` when present (for document head). */
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
}

export interface BlogPost {
  id?: string | number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  author?: { name: string; email?: string };
  /** Featured / cover image URL from CMS when present */
  coverImage?: string;
  coverImageAlt?: string;
  seoMeta?: { title?: string; description?: string };
}

export interface Testimonial {
  id: string | number;
  quote: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  projectTitle?: string;
  rating?: number;
  approved?: boolean;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  process?: string[];
  deliverables?: string[];
  icon?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  calendarLink?: string;
  socials?: { name: string; url: string; icon?: string }[];
}

export interface SiteContent {
  services: Service[];
  pricingTiers: PricingTier[];
  faq: FAQItem[];
  contact: ContactInfo;
  techStack: string[];
  about?: {
    tagline?: string;
    mission?: string;
    values?: string[];
    team?: { name: string; role: string; bio?: string; avatar?: string }[];
    processTimeline?: { title: string; description: string }[];
    stats?: { value: number; label: string }[];
  };
}
