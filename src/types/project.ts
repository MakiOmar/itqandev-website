/**
 * Project entity types
 */
import type { Category } from './category';
import type { Skill } from './skill';
import type { Media } from './media';
import type { ProjectTranslationRow } from './site-language';
import type { ContentSeoMetaRow } from './content-seo';

/** @alias Per-locale SEO row from API */
export type ProjectSeoMeta = ContentSeoMetaRow;

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
