/**
 * Site content languages (from Laravel settings API)
 */
export interface SiteLanguageRow {
  code: string;
  label: string;
  native_label: string;
  rtl: boolean;
}

export interface ProjectTranslationRow {
  locale: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
}

export interface BlogTranslationRow {
  locale: string;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
}

export interface CategoryTranslationRow {
  locale: string;
  name?: string | null;
  description?: string | null;
}
