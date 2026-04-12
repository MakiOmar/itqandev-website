/**
 * Admin / API service entity (Laravel `services` + `service_translations`).
 */
export interface ServiceTranslationRow {
  locale: string;
  name?: string | null;
  short_description?: string | null;
  description?: string | null;
  process?: string[] | null;
  deliverables?: string[] | null;
}

export interface AdminService {
  id: number;
  name: string;
  slug: string;
  content_locale?: string | null;
  short_description?: string | null;
  description?: string | null;
  process?: string[] | null;
  deliverables?: string[] | null;
  icon?: string | null;
  sort_order?: number;
  is_published?: boolean;
  translations?: ServiceTranslationRow[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCreateInput {
  name: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  process?: string[];
  deliverables?: string[];
  icon?: string | null;
  sort_order?: number;
  is_published?: boolean;
  content_locale?: string | null;
  translations?: ServiceTranslationRow[];
}

export interface ServiceUpdateInput extends Partial<ServiceCreateInput> {
  id: number;
}
