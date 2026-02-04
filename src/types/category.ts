/**
 * Category entity types
 */
import type { Media } from './media';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
  icon?: Media;
  thumb?: Media;
  banner?: Media;
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  isFeatured?: boolean;
  iconId?: number;
  thumbId?: number;
  bannerId?: number;
}

export interface CategoryUpdateInput extends Partial<CategoryCreateInput> {
  id: number;
}
