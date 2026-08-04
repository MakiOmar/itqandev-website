/**
 * Media entity types
 */

export interface MediaTranslationFields {
  alt_text?: string | null;
  description?: string | null;
}

export interface Media {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  collectionName?: string;
  modelType?: string;
  modelId?: number;
  folderId?: number;
  altText?: string;
  description?: string;
  /** Secondary locales keyed by language code (primary lives on altText/description). */
  translations?: Record<string, MediaTranslationFields>;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  folder?: MediaFolder;
  tags?: MediaTag[];
}

export interface MediaFolder {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaTag {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadInput {
  file: File;
  collectionName?: string;
  modelType?: string;
  modelId?: number;
  folderId?: number;
  altText?: string;
  description?: string;
}

export interface MediaUpdateInput {
  id: number;
  altText?: string;
  description?: string;
  folderId?: number;
  tagIds?: number[];
  locale?: string;
  translations?: Record<string, MediaTranslationFields>;
}

export interface MediaFilter {
  type?: string;
  collection?: string;
  modelType?: string;
  modelId?: number;
  folderId?: number;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'name' | 'nameDesc' | 'size' | 'sizeAsc';
}
