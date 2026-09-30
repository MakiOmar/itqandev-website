/**
 * Builder leaf styles: catalog, cascade, and CSS variable mapping.
 * Inspector UI lives in admin components; this module is safe for public render.
 */

export type StyleBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type StyleBag = Record<string, unknown>;

export type BuilderStyles = Partial<Record<StyleBreakpoint, StyleBag>>;

export type StyleLength = { value: number; unit: string };

export type StyleDimensions = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: string;
  linked?: boolean;
};

export type StyleFilters = {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
};

export type StyleShadow = {
  color: string;
  h: number;
  v: number;
  blur: number;
  spread: number;
  inset?: boolean;
};

export const STYLE_GROUP_ORDER = [
  'typography',
  'layout',
  'spacing',
  'image',
  'border',
  'hover',
  'caption',
  'title',
  'subtitle',
  'btn_primary',
  'btn_secondary',
  'tabs',
  'nav_buttons',
  'link',
  'card_box',
  'card_category',
  'card_title',
  'card_summary',
  'card_chips',
  'btn_card',
  'rating',
  'quote',
  'author_name',
  'author_meta',
  'avatar',
  'custom',
] as const;

export type StyleGroupId = (typeof STYLE_GROUP_ORDER)[number];

/** Layout/spacing/border/custom — Elementor-like container chrome (band / row / column). */
export const CONTAINER_STYLE_TYPE = '__container__';

const DEFAULT_LEAF_STYLE_GROUPS: readonly StyleGroupId[] = [
  'typography',
  'layout',
  'spacing',
  'border',
  'hover',
  'custom',
];

/** Widget/kit type → style groups. Unknown types still get a complete Style tab. */
export const WIDGET_STYLE_GROUPS: Record<string, readonly StyleGroupId[]> = {
  [CONTAINER_STYLE_TYPE]: ['layout', 'spacing', 'border', 'custom'],
  image: ['typography', 'layout', 'spacing', 'image', 'border', 'hover', 'caption', 'custom'],
  image_text: ['typography', 'layout', 'spacing', 'image', 'border', 'hover', 'caption', 'custom'],
  gallery: ['layout', 'spacing', 'image', 'border', 'hover', 'caption', 'custom'],
  lottie: ['layout', 'spacing', 'border', 'custom'],
  hero: ['typography', 'btn_primary', 'btn_secondary', 'layout', 'spacing', 'border', 'hover', 'custom'],
  flip_box: ['typography', 'layout', 'spacing', 'border', 'hover', 'custom'],
  trust_badges: ['typography', 'spacing', 'border', 'custom'],
  button: ['typography', 'layout', 'spacing', 'border', 'hover', 'custom'],
  case_studies: [
    'title', 'subtitle', 'tabs', 'nav_buttons', 'link',
    'card_box', 'card_category', 'card_title', 'card_summary', 'card_chips', 'btn_card',
    'layout', 'spacing', 'border', 'custom',
  ],
  services_teaser: ['layout', 'spacing', 'border', 'custom'],
  testimonials: [
    'title', 'subtitle', 'card_box', 'rating', 'quote', 'author_name', 'author_meta', 'avatar', 'nav_buttons',
    'layout', 'spacing', 'border', 'custom',
  ],
  blog_preview: ['layout', 'spacing', 'border', 'custom'],
  projects_list: ['layout', 'spacing', 'border', 'custom'],
  loop_grid: ['layout', 'spacing', 'border', 'custom'],
  testimonial_list: [
    'typography', 'title', 'subtitle', 'card_box', 'rating', 'quote', 'author_name', 'author_meta', 'avatar',
    'nav_buttons', 'layout', 'spacing', 'border', 'custom',
  ],
  form: ['typography', 'layout', 'spacing', 'border', 'custom'],
};

export function containerStyleGroups(): readonly StyleGroupId[] {
  return WIDGET_STYLE_GROUPS[CONTAINER_STYLE_TYPE] ?? [];
}

/** Layout keys that only affect `.b-styled-media` (skip for kits without media). */
export const MEDIA_ONLY_STYLE_KEYS = new Set(['object_fit', 'object_position']);

export function widgetStyleGroups(type: string): readonly StyleGroupId[] {
  if (type === CONTAINER_STYLE_TYPE) {
    return containerStyleGroups();
  }
  return WIDGET_STYLE_GROUPS[type] ?? DEFAULT_LEAF_STYLE_GROUPS;
}

export function hasWidgetStyleControls(type: string): boolean {
  return widgetStyleGroups(type).length > 0;
}

/** True when the type uses image/media chrome (object-fit, hover on media, etc.). */
export function widgetHasMediaStyleChrome(type: string): boolean {
  const groups = widgetStyleGroups(type);
  return groups.includes('image') || groups.includes('hover') || groups.includes('caption');
}

export function resolveStyleBags(styles?: BuilderStyles | null): {
  mobile: StyleBag;
  tablet: StyleBag;
  desktop: StyleBag;
} {
  const desktop = { ...(styles?.desktop ?? {}) };
  const tablet = { ...desktop, ...(styles?.tablet ?? {}) };
  const mobile = { ...tablet, ...(styles?.mobile ?? {}) };
  return { mobile, tablet, desktop };
}

const RADIUS_TOKEN: Record<string, string> = {
  none: '0px',
  md: '0.375rem',
  lg: '0.5rem',
  full: '9999px',
};

function isLength(v: unknown): v is StyleLength {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'unit' in v && 'value' in v;
}

function isDims(v: unknown): v is StyleDimensions {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'top' in v && 'unit' in v;
}

function isFilters(v: unknown): v is StyleFilters {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'blur' in v && 'brightness' in v;
}

function isShadow(v: unknown): v is StyleShadow {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'blur' in v && 'h' in v && 'color' in v;
}

export function lengthToCss(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? null : t;
  }
  if (!isLength(value)) return null;
  if (value.unit === 'auto') return 'auto';
  return `${value.value}${value.unit}`;
}

function filtersToCss(value: unknown): string | null {
  if (!isFilters(value)) return null;
  const parts = [
    value.blur ? `blur(${value.blur}px)` : '',
    value.brightness !== 100 ? `brightness(${value.brightness}%)` : '',
    value.contrast !== 100 ? `contrast(${value.contrast}%)` : '',
    value.saturate !== 100 ? `saturate(${value.saturate}%)` : '',
    value.hue ? `hue-rotate(${value.hue}deg)` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function shadowToCss(value: unknown): string | null {
  if (!isShadow(value)) return null;
  const inset = value.inset ? 'inset ' : '';
  return `${inset}${value.h}px ${value.v}px ${value.blur}px ${value.spread}px ${value.color}`;
}

/**
 * Widget-part keys (filter tabs, carousel nav buttons, section link). Emitted as `--s-*` vars;
 * each widget's CSS maps them onto its own elements. Colours/weights/transforms pass through
 * (already sanitised on save), lengths go through lengthToCss.
 */
const WIDGET_PART_STRING_KEYS = [
  'tab_color', 'tab_bg', 'tab_hover_color', 'tab_hover_bg', 'tab_active_color', 'tab_active_bg',
  'tab_indicator_color', 'tab_font_weight',
  'nav_color', 'nav_bg', 'nav_border_color', 'nav_hover_color', 'nav_hover_bg',
  'link_color', 'link_hover_color', 'link_font_weight', 'link_transform',
  'title_color', 'title_font_weight', 'title_transform',
  'subtitle_color', 'subtitle_font_weight', 'subtitle_transform',
] as const;
const WIDGET_PART_LENGTH_KEYS = [
  'tab_font_size', 'tab_radius', 'nav_size', 'nav_icon_size', 'nav_radius',
  'link_font_size', 'link_letter_spacing',
  'title_font_size', 'title_line_height', 'title_letter_spacing',
  'subtitle_font_size', 'subtitle_line_height', 'subtitle_letter_spacing',
] as const;

/** Detailed case study card parts. Value kind decides how each key is emitted. */
export const CASE_CARD_STYLE_KEYS = {
  card_bg: 'color', card_border_color: 'color', card_hover_border_color: 'color',
  card_border_width: 'length', card_radius: 'length', card_padding: 'length',
  card_shadow: 'shadow', card_hover_shadow: 'shadow',
  card_cat_font_size: 'length', card_cat_font_weight: 'string', card_cat_transform: 'string',
  card_cat_letter_spacing: 'length', card_cat_color: 'color', card_cat_bg: 'color', card_cat_radius: 'length',
  card_title_font_size: 'length', card_title_font_weight: 'string', card_title_line_height: 'length',
  card_title_letter_spacing: 'length', card_title_transform: 'string', card_title_color: 'color',
  card_title_hover_color: 'color',
  card_summary_font_size: 'length', card_summary_font_weight: 'string', card_summary_line_height: 'length',
  card_summary_color: 'color',
  card_chip_font_size: 'length', card_chip_font_weight: 'string', card_chip_color: 'color',
  card_chip_bg: 'color', card_chip_border_color: 'color', card_chip_radius: 'length',
} as const satisfies Record<string, 'color' | 'string' | 'length' | 'shadow'>;

/** Testimonial card parts (stars, quote, author, avatar); the card box reuses the `card_*` keys above. */
export const TESTIMONIAL_STYLE_KEYS = {
  rating_color: 'color', rating_empty_color: 'color', rating_size: 'length',
  quote_font_size: 'length', quote_font_weight: 'string', quote_line_height: 'length',
  quote_letter_spacing: 'length', quote_font_style: 'string', quote_color: 'color',
  author_name_font_size: 'length', author_name_font_weight: 'string', author_name_transform: 'string',
  author_name_letter_spacing: 'length', author_name_color: 'color', author_divider_color: 'color',
  author_meta_font_size: 'length', author_meta_font_weight: 'string', author_meta_color: 'color',
  avatar_size: 'length', avatar_radius: 'length', avatar_ring_width: 'length', avatar_ring_color: 'color',
} as const satisfies Record<string, 'color' | 'string' | 'length' | 'shadow'>;

const PART_STYLE_KEYS: Record<string, 'color' | 'string' | 'length' | 'shadow'> = {
  ...CASE_CARD_STYLE_KEYS,
  ...TESTIMONIAL_STYLE_KEYS,
};

/** Button parts (`btn_primary_*`, `btn_secondary_*`, `btn_card_*`): hero CTAs and the case study card button. */
export const BUTTON_PARTS = ['btn_primary', 'btn_secondary', 'btn_card'] as const;
export type ButtonPart = (typeof BUTTON_PARTS)[number];
export const BUTTON_STRING_SUFFIXES = [
  'color', 'bg', 'border_color', 'hover_color', 'hover_bg', 'hover_border_color', 'font_weight', 'transform',
] as const;
export const BUTTON_LENGTH_SUFFIXES = [
  'font_size', 'letter_spacing', 'border_width', 'radius', 'min_width', 'padding_x', 'padding_y',
] as const;
export const BUTTON_SHADOW_SUFFIXES = ['shadow', 'hover_shadow'] as const;

function varName(key: string, suffix: '' | '-md' | '-lg'): string {
  return `--s-${key.replace(/_/g, '-')}${suffix}`;
}

function emitBagVars(bag: StyleBag, suffix: '' | '-md' | '-lg', out: Record<string, string>): void {
  const set = (key: string, css: string | null | undefined) => {
    if (css == null || css === '') return;
    out[varName(key, suffix)] = css;
  };

  set('align', typeof bag.align === 'string' ? bag.align : null);
  if (bag.align === 'center') {
    set('align-ml', 'auto');
    set('align-mr', 'auto');
  } else if (bag.align === 'end' || bag.align === 'right') {
    set('align-ml', 'auto');
    set('align-mr', '0');
  } else if (bag.align === 'start' || bag.align === 'left') {
    set('align-ml', '0');
    set('align-mr', 'auto');
  }
  set('width', lengthToCss(bag.width));
  set('max-width', lengthToCss(bag.max_width));
  set('height', lengthToCss(bag.height));
  set('object-fit', typeof bag.object_fit === 'string' ? bag.object_fit : null);
  set('object-position', typeof bag.object_position === 'string' ? bag.object_position : null);
  set('overflow', typeof bag.overflow === 'string' ? bag.overflow : null);
  if (typeof bag.z_index === 'number') set('z-index', String(bag.z_index));
  if (typeof bag.opacity === 'number') set('opacity', String(bag.opacity));
  set('filter', filtersToCss(bag.filters));
  set('border-style', typeof bag.border_style === 'string' ? bag.border_style : null);
  set('border-width', lengthToCss(bag.border_width));
  set('border-color', typeof bag.border_color === 'string' ? bag.border_color : null);
  set('radius', lengthToCss(bag.radius));
  set('box-shadow', shadowToCss(bag.box_shadow));
  if (typeof bag.hover_opacity === 'number') set('hover-opacity', String(bag.hover_opacity));
  set('hover-filter', filtersToCss(bag.hover_filters));
  if (typeof bag.hover_transition === 'number') set('hover-transition', `${bag.hover_transition}ms`);
  set('hover-box-shadow', shadowToCss(bag.hover_box_shadow));
  const anim = bag.hover_animation;
  if (anim === 'grow') set('hover-transform', 'scale(1.05)');
  else if (anim === 'shrink') set('hover-transform', 'scale(0.95)');
  else if (anim === 'float') set('hover-transform', 'translateY(-8px)');
  else if (anim === 'sink') set('hover-transform', 'translateY(8px)');
  else if (anim === 'none') set('hover-transform', 'none');
  set('caption-align', typeof bag.caption_align === 'string' ? bag.caption_align : null);
  set('caption-color', typeof bag.caption_color === 'string' ? bag.caption_color : null);
  set('caption-font-size', lengthToCss(bag.caption_font_size));
  set('caption-font-weight', typeof bag.caption_font_weight === 'string' ? bag.caption_font_weight : null);
  set('caption-transform', typeof bag.caption_transform === 'string' ? bag.caption_transform : null);
  set('caption-font-style', typeof bag.caption_font_style === 'string' ? bag.caption_font_style : null);
  set('caption-decoration', typeof bag.caption_decoration === 'string' ? bag.caption_decoration : null);
  set('caption-line-height', lengthToCss(bag.caption_line_height));
  set('caption-letter-spacing', lengthToCss(bag.caption_letter_spacing));
  set('caption-spacing', lengthToCss(bag.caption_spacing));
  set('font-family', typeof bag.font_family === 'string' ? bag.font_family : null);
  set('font-size', lengthToCss(bag.font_size));
  set('font-weight', typeof bag.font_weight === 'string' ? bag.font_weight : null);
  set('line-height', lengthToCss(bag.line_height));
  set('letter-spacing', lengthToCss(bag.letter_spacing));
  set('text-color', typeof bag.text_color === 'string' ? bag.text_color : null);
  set('text-transform', typeof bag.text_transform === 'string' ? bag.text_transform : null);
  set('font-style', typeof bag.font_style === 'string' ? bag.font_style : null);
  set('text-decoration', typeof bag.text_decoration === 'string' ? bag.text_decoration : null);
  for (const key of WIDGET_PART_STRING_KEYS) set(key, typeof bag[key] === 'string' ? (bag[key] as string) : null);
  for (const key of WIDGET_PART_LENGTH_KEYS) set(key, lengthToCss(bag[key]));
  for (const [key, kind] of Object.entries(PART_STYLE_KEYS)) {
    const v = bag[key];
    if (kind === 'length') set(key, lengthToCss(v));
    else if (kind === 'shadow') set(key, shadowToCss(v));
    else set(key, typeof v === 'string' ? v : null);
  }
  for (const part of BUTTON_PARTS) {
    for (const s of BUTTON_STRING_SUFFIXES) {
      const v = bag[`${part}_${s}`];
      set(`${part}_${s}`, typeof v === 'string' ? v : null);
    }
    for (const s of BUTTON_LENGTH_SUFFIXES) set(`${part}_${s}`, lengthToCss(bag[`${part}_${s}`]));
    for (const s of BUTTON_SHADOW_SUFFIXES) set(`${part}_${s}`, shadowToCss(bag[`${part}_${s}`]));
  }

  if (isDims(bag.margin)) {
    const u = bag.margin.unit === 'auto' ? 'px' : bag.margin.unit;
    set('mt', `${bag.margin.top}${u}`);
    set('mr', `${bag.margin.right}${u}`);
    set('mb', `${bag.margin.bottom}${u}`);
    set('ml', `${bag.margin.left}${u}`);
  }
  if (isDims(bag.padding)) {
    const u = bag.padding.unit === 'auto' ? 'px' : bag.padding.unit;
    set('pt', `${bag.padding.top}${u}`);
    set('pr', `${bag.padding.right}${u}`);
    set('pb', `${bag.padding.bottom}${u}`);
    set('pl', `${bag.padding.left}${u}`);
  }
}

function settingsFallbackBag(settings?: Record<string, unknown> | null): StyleBag {
  if (!settings) return {};
  const bag: StyleBag = {};
  const fit = settings.object_fit;
  if (fit === 'contain' || fit === 'cover' || fit === 'fill' || fit === 'none' || fit === 'scale-down') {
    bag.object_fit = fit;
  }
  const radius = settings.radius;
  if (typeof radius === 'string' && RADIUS_TOKEN[radius]) {
    bag.radius = RADIUS_TOKEN[radius];
  }
  return bag;
}

export function builderStyleCssVars(
  styles?: BuilderStyles | null,
  settingsFallback?: Record<string, unknown> | null,
): Record<string, string> {
  const resolved = resolveStyleBags(styles);
  const fallback = settingsFallbackBag(settingsFallback);
  const out: Record<string, string> = {};
  emitBagVars({ ...fallback, ...resolved.mobile }, '', out);
  emitBagVars({ ...fallback, ...resolved.tablet }, '-md', out);
  emitBagVars({ ...fallback, ...resolved.desktop }, '-lg', out);
  return out;
}

export function hoverAnimationClass(styles?: BuilderStyles | null): string {
  const anim = resolveStyleBags(styles).desktop.hover_animation;
  if (anim === 'grow' || anim === 'shrink' || anim === 'float' || anim === 'sink') {
    return `b-anim-${anim}`;
  }
  return '';
}

export function sanitizeCustomCss(raw: string): string {
  return raw
    .replace(/<\/style>/gi, '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/-moz-binding/gi, '')
    .replace(/behavior\s*:/gi, '')
    .trim()
    .slice(0, 8000);
}

export function cssSafeBlockId(id: string): string {
  return String(id || 'x').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function scopedCustomCss(blockId: string, styles?: BuilderStyles | null): string | null {
  const raw = String(
    styles?.desktop?.custom_css || styles?.tablet?.custom_css || styles?.mobile?.custom_css || '',
  );
  const css = sanitizeCustomCss(raw);
  if (!css) return null;
  const safe = cssSafeBlockId(blockId);
  return css.replace(/\bselector\b/g, `#b-${safe}`);
}

export function hasAnyStyles(styles?: BuilderStyles | null): boolean {
  if (!styles) return false;
  return !!(
    (styles.desktop && Object.keys(styles.desktop).length) ||
    (styles.tablet && Object.keys(styles.tablet).length) ||
    (styles.mobile && Object.keys(styles.mobile).length)
  );
}

