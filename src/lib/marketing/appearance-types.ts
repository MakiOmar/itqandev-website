/** Appearance builder types shared by public shell + admin. */

export type HomepageLayoutWidth = 'boxed' | 'full';

export type HomepageSectionType =
  | 'hero'
  | 'services_teaser'
  | 'case_studies'
  | 'testimonials'
  | 'tech_stack'
  | 'blog_preview'
  | 'cta'
  | 'form';

export type HomepageSectionInstance = {
  id: string;
  type: HomepageSectionType | string;
  enabled?: boolean;
  layout_width?: HomepageLayoutWidth;
  settings?: Record<string, unknown>;
};

/** CMS Pages layout: band → row → columns → leaf blocks (homepage stays flat). */
export type LayoutBreakpoint = 'mobile' | 'tablet' | 'desktop';

export type ColumnSpans = {
  mobile: number;
  tablet: number;
  desktop: number;
};

export type PageLayoutStackBelow = 'none' | 'tablet' | 'desktop';

export type PageLayoutBlock = {
  id: string;
  kind?: 'widget' | 'kit';
  type: HomepageSectionType | string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
};

export type PageLayoutColumn = {
  id: string;
  span: ColumnSpans;
  blocks: PageLayoutBlock[];
};

export type PageLayoutRow = {
  id: string;
  stack_below?: PageLayoutStackBelow;
  gap?: number;
  columns: PageLayoutColumn[];
};

export type PageLayoutBand = {
  id: string;
  type: 'layout';
  enabled?: boolean;
  layout_width?: HomepageLayoutWidth;
  settings?: Record<string, unknown>;
  rows: PageLayoutRow[];
};

/** Pages admin / API may still hold legacy flat sections until normalize wraps them. */
export type PageSectionNode = PageLayoutBand | HomepageSectionInstance;

export const FULL_COLUMN_SPANS: ColumnSpans = { mobile: 12, tablet: 12, desktop: 12 };

/** Header / footer appearance builder document (page-layout tree). */
export type ChromeBuilderDocument = {
  sections: PageSectionNode[];
};

/** @deprecated Alias for ChromeBuilderDocument */
export type FooterBuilderDocument = ChromeBuilderDocument;

export type FooterPublicPayload = ChromeBuilderDocument;
export type HeaderPublicPayload = ChromeBuilderDocument;

export type AppearanceSettingFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'media'
  | 'json'
  | 'floating_icons'
  | 'color'
  | 'form'
  | 'select'
  | 'url'
  | 'link'
  | 'video'
  | 'richtext'
  | 'repeater'
  | 'icon'
  | 'page'
  | 'menu';

export type AppearanceSettingField = {
  key: string;
  type: AppearanceSettingFieldType;
  label: string;
  accept?: string;
  min?: number;
  max?: number;
  /** When true, edited per language tab into settings.translations.{locale}. */
  translatable?: boolean;
  options?: Array<{ value: string; label: string }>;
  item_fields?: AppearanceSettingField[];
};

/** Floating ornament icons around the hero media (admin stores media_id; public gets url). */
export type HeroFloatingIconMotion = 'rotate' | 'diagonal' | 'bounce';

export type HeroFloatingIcon = {
  id: string;
  enabled?: boolean;
  media_id?: number | null;
  /** Present on public shell after resolve. */
  url?: string;
  alt?: string | null;
  motion?: HeroFloatingIconMotion | string;
  /** Percent of hero media box (−20…120; &lt;0 / &gt;100 hangs outside edges). */
  x?: number;
  y?: number;
  size?: number;
};

export type AppearanceRegistryEntry = {
  type: string;
  kind?: 'widget' | 'kit';
  label: string;
  category?: string;
  max_instances: number | null;
  default_settings?: Record<string, unknown>;
  settings_fields?: AppearanceSettingField[];
};

export const DEFAULT_HOMEPAGE_SECTION_ORDER: HomepageSectionType[] = [
  'hero',
  'services_teaser',
  'case_studies',
  'testimonials',
  'tech_stack',
  'blog_preview',
  'cta',
];

export function defaultHomepageSections(): HomepageSectionInstance[] {
  return DEFAULT_HOMEPAGE_SECTION_ORDER.map((type) => ({
    id: `sec_${type}`,
    type,
    enabled: true,
    layout_width: type === 'hero' ? 'full' : 'boxed',
    settings: {},
  }));
}
