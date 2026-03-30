/**
 * Category entity types
 */
import type { Media } from './media';

export interface Category {
  id: number;
  name: string;
  slug: string;
  content_locale?: string | null;
  description?: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
  icon?: Media;
  thumb?: Media;
  banner?: Media;
  translations?: Array<{ locale: string; name?: string | null; description?: string | null }>;
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  content_locale?: string | null;
  description?: string;
  isFeatured?: boolean;
  iconId?: number;
  thumbId?: number;
  bannerId?: number;
  translations?: Array<{ locale: string; name?: string | null; description?: string | null }>;
}

export interface CategoryUpdateInput extends Partial<CategoryCreateInput> {
  id: number;
}
