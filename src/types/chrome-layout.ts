/**
 * Named header/footer/body chrome layouts (admin).
 */

export type ChromeLayoutKind =
  | 'header'
  | 'footer'
  | 'body'
  | 'single'
  | 'archive'
  | 'loop_item'
  | 'overlay';

export type ChromeLayoutStatus = 'draft' | 'published';

export type ChromeLayoutMeta = {
  id: number;
  kind: ChromeLayoutKind;
  name: string;
  slug: string;
  status: ChromeLayoutStatus;
  is_site_default: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  sections?: unknown[];
  document?: { sections?: unknown[]; overlay?: OverlayMeta | null };
  overlay?: OverlayMeta | null;
};

export type OverlayMeta = {
  delay_ms: number;
  once: boolean;
  sitewide: boolean;
};

/** `homepage` or a registry content type key (GET /appearance/registries → content_types). */
export type ChromeContentType = string;

export type ChromeTypeDefault = { header_id: number | null; footer_id: number | null };

export type ChromeTypeDefaults = Record<ChromeContentType, ChromeTypeDefault>;

export type ThemeTemplateStatus = 'draft' | 'published';

export type ThemeConditionRule = {
  include: boolean;
  group: 'entire' | 'singular' | 'archive' | 'advanced';
  key: string;
  value: string | number | null;
};

export type ThemeTemplateConditionsDoc = {
  relation: 'and' | 'or';
  rules: ThemeConditionRule[];
};

export type ThemeTemplateMeta = {
  id: number;
  name: string;
  status: ThemeTemplateStatus;
  document_type?: 'chrome' | 'single' | 'archive' | 'loop_item' | 'overlay';
  conditions: ThemeTemplateConditionsDoc;
  header_layout_id: number | null;
  footer_layout_id: number | null;
  body_layout_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};
