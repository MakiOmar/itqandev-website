import type { PageSectionNode } from '../lib/marketing/appearance-types';

export type PageTranslationRow = {
  locale: string;
  title?: string | null;
  excerpt?: string | null;
};

export type AdminPage = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'draft' | 'published' | string;
  content_locale: string | null;
  published_at: string | null;
  sections: PageSectionNode[];
  translations: PageTranslationRow[];
  header_layout_id?: number | null;
  footer_layout_id?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicPageDetail = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content_locale?: string | null;
  published_at: string | null;
  sections: PageSectionNode[];
  /** Localized SEO snippet from public API (`SeoMetaPresenter::toPublicSnippet`). */
  seo_meta?: unknown;
};
