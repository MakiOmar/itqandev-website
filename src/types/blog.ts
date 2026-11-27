/**
 * Blog post entity types
 */
import type { Media } from './media';
import type { BlogTranslationRow } from './site-language';
import type { ContentSeoMetaRow } from './content-seo';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content_locale?: string | null;
  excerpt?: string;
  content?: string;
  /** Visual builder layout bands (same shape as CMS pages). */
  sections?: PageSectionNode[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  authorId?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  featuredImage?: Media;
  translations?: BlogTranslationRow[];
  seoMetas?: ContentSeoMetaRow[];
}

export interface BlogPostCreateInput {
  title: string;
  slug?: string;
  content_locale?: string | null;
  excerpt?: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  publishedAt?: string;
  featuredImageId?: number;
  translations?: BlogTranslationRow[];
}

export interface BlogPostUpdateInput extends Partial<BlogPostCreateInput> {
  id: number;
}
