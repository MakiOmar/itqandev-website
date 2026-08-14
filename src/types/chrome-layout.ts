/**
 * Named header/footer chrome layouts (admin).
 */

export type ChromeLayoutKind = 'header' | 'footer';

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
