/**
 * Project entity types
 */
import type { Category } from './category';
import type { Skill } from './skill';
import type { Media } from './media';

export interface Project {
  id: number;
  title: string;
  slug: string;
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
}

export interface ProjectCreateInput {
  title: string;
  slug?: string;
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
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {
  id: number;
}
