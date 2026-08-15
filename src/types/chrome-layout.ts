/**
 * Named header/footer/body chrome layouts (admin).
 */

export type ChromeLayoutKind = 'header' | 'footer' | 'body';

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
  document?: { sections?: unknown[] };
};

export type ChromeTypeDefaults = Record<
  'homepage' | 'page' | 'project' | 'blog_post' | 'service',
  { header_id: number | null; footer_id: number | null }
>;

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
  conditions: ThemeTemplateConditionsDoc;
  header_layout_id: number | null;
  footer_layout_id: number | null;
  body_layout_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};
