/**
 * Project entity types
 */
import type { Category } from './category';
import type { Skill } from './skill';
import type { Media } from './media';
import type { ProjectTranslationRow } from './site-language';

/** Mirrors Laravel `seo_metas` rows (snake_case from API). */
export interface ProjectSeoMeta {
  id?: number;
  locale: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
}

export interface Project {
  id: number;
  title: string;
  slug: string;
  /** Primary language for main columns; omit/null = site default */
  content_locale?: string | null;
  summary?: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  link_url?: string;
  repo_url?: string;
  demo_url?: string;
  featured: boolean;
  published_at?: string;
  createdAt: string;
  updatedAt: string;
  categories?: Category[];
  skills?: Skill[];
  heroImage?: Media;
  translations?: ProjectTranslationRow[];
  seoMetas?: ProjectSeoMeta[];
}

export interface ProjectCreateInput {
  title: string;
  slug?: string;
  content_locale?: string | null;
  summary?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  link_url?: string;
  repo_url?: string;
  demo_url?: string;
  featured?: boolean;
  published_at?: string;
  category_ids?: number[];
  skill_ids?: number[];
  heroImageId?: number;
  translations?: ProjectTranslationRow[];
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {
  id: number;
}
