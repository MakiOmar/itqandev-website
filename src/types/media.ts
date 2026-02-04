/**
 * Media entity types
 */

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
