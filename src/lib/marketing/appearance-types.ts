/** Appearance builder types shared by public shell + admin. */

export type HomepageLayoutWidth = 'boxed' | 'full';

export type HomepageSectionType =
  | 'hero'
  | 'services_teaser'
  | 'case_studies'
  | 'testimonials'
  | 'tech_stack'
  | 'blog_preview'
  | 'cta';

export type HomepageSectionInstance = {
  id: string;
  type: HomepageSectionType | string;
  enabled?: boolean;
  layout_width?: HomepageLayoutWidth;
  settings?: Record<string, unknown>;
};

export type FooterMode = 'hardcoded' | 'builder';

export type FooterBlockType =
  | 'brand'
  | 'contact'
  | 'social'
  | 'menu'
  | 'links'
  | 'rich_text'
  | 'cta';

export type FooterBlockInstance = {
  id: string;
  type: FooterBlockType | string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
};

export type FooterColumnInstance = {
  id: string;
  span: number;
  blocks: FooterBlockInstance[];
};

export type FooterZoneInstance = {
  enabled: boolean;
  columns: FooterColumnInstance[];
};

export type FooterBuilderDocument = {
  mode: FooterMode;
  zones: {
    top?: FooterZoneInstance;
    main?: FooterZoneInstance;
    bottom?: FooterZoneInstance;
  };
};

export type FooterPublicPayload =
  | { mode: 'hardcoded' }
  | {
      mode: 'builder';
      zones: Partial<Record<'top' | 'main' | 'bottom', FooterZoneInstance>>;
    };

export type AppearanceRegistryEntry = {
  type: string;
  label: string;
  max_instances: number | null;
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
