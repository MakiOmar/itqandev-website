import type { SiteLanguageRow } from '../../types/site-language';

/**
 * @deprecated Import `usePublicSiteMeta` from `~/routes/[lang]/admin/layout` instead.
 * Kept for type compatibility in admin forms.
 */
export interface SiteLanguageConfig {
  site_languages: SiteLanguageRow[];
  default_locale: string;
  secondary: SiteLanguageRow[];
  content_editing_locale: string;
}
