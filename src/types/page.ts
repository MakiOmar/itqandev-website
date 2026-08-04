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
  sections: unknown[];
  translations: PageTranslationRow[];
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
  sections: Array<{
    id: string;
    type: string;
    layout_width?: string;
    settings?: Record<string, unknown>;
  }>;
  /** Localized SEO snippet from public API (`SeoMetaPresenter::toPublicSnippet`). */
  seo_meta?: unknown;
};
