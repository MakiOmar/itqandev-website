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
  'layout',
  'spacing',
  'image',
  'border',
  'hover',
  'caption',
  'custom',
] as const;

export type StyleGroupId = (typeof STYLE_GROUP_ORDER)[number];

/** Widget/kit type → style groups. Add a type here to opt a leaf into the Style tab. */
export const WIDGET_STYLE_GROUPS: Record<string, readonly StyleGroupId[]> = {
  image: ['layout', 'spacing', 'image', 'border', 'hover', 'caption', 'custom'],
  image_text: ['layout', 'spacing', 'image', 'border', 'hover', 'caption', 'custom'],
};

export function widgetStyleGroups(type: string): readonly StyleGroupId[] {
  return WIDGET_STYLE_GROUPS[type] ?? [];
}

export function hasWidgetStyleControls(type: string): boolean {
  return widgetStyleGroups(type).length > 0;
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
  } else if (bag.align === 'right') {
    set('align-ml', 'auto');
    set('align-mr', '0');
  } else if (bag.align === 'left') {
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

