/**
 * Blog post entity types
 */
import type { Media } from './media';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
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
}

export interface BlogPostCreateInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  publishedAt?: string;
  featuredImageId?: number;
}

export interface BlogPostUpdateInput extends Partial<BlogPostCreateInput> {
  id: number;
}
