/**
 * Admin Style-tab catalog. Public render uses ~/lib/marketing/builder-styles only.
 */
import {
  widgetStyleGroups,
  widgetHasMediaStyleChrome,
  MEDIA_ONLY_STYLE_KEYS,
  type BuilderStyles,
  type ButtonPart,
  type StyleBreakpoint,
  type StyleDimensions,
  type StyleFilters,
  type StyleGroupId,
  type StyleLength,
  type StyleShadow,
} from '~/lib/marketing/builder-styles';

export type StyleControlType =
  | 'choose'
  | 'select'
  | 'length'
  | 'dimensions'
  | 'color'
  | 'slider'
  | 'number'
  | 'filters'
  | 'shadow'
  | 'textarea';

export type StyleControl = {
  key: string;
  group: string;
  type: StyleControlType;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; labelKey: string }>;
};

export const STYLE_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh', 'auto'] as const;

export const STYLE_DEVICES: StyleBreakpoint[] = ['mobile', 'tablet', 'desktop'];

export const DEFAULT_FILTERS: StyleFilters = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
};

export const DEFAULT_SHADOW: StyleShadow = {
  color: '#00000066',
  h: 0,
  v: 0,
  blur: 10,
  spread: 0,
  inset: false,
};

export const DEFAULT_DIMENSIONS: StyleDimensions = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  unit: 'px',
  linked: true,
};

const WEIGHT_OPTIONS = [
  { value: '400', labelKey: 'builder.style.weightNormal' },
  { value: '500', labelKey: 'builder.style.weightMedium' },
  { value: '600', labelKey: 'builder.style.weightSemibold' },
  { value: '700', labelKey: 'builder.style.weightBold' },
];

const TRANSFORM_OPTIONS = [
  { value: 'none', labelKey: 'builder.style.transformNone' },
  { value: 'uppercase', labelKey: 'builder.style.transformUpper' },
  { value: 'lowercase', labelKey: 'builder.style.transformLower' },
  { value: 'capitalize', labelKey: 'builder.style.transformCap' },
];

/** Typography + colour for a section heading part (`title_*`, `subtitle_*`). */
function sectionTextControls(part: 'title' | 'subtitle', maxSize: number): StyleControl[] {
  return [
    { key: `${part}_font_size`, group: part, type: 'length', min: 8, max: maxSize },
    { key: `${part}_font_weight`, group: part, type: 'select', options: WEIGHT_OPTIONS },
    { key: `${part}_line_height`, group: part, type: 'length', min: 0, max: 160 },
    { key: `${part}_letter_spacing`, group: part, type: 'length', min: -5, max: 20 },
    { key: `${part}_transform`, group: part, type: 'select', options: TRANSFORM_OPTIONS },
    { key: `${part}_color`, group: part, type: 'color' },
  ];
}

/** Detailed case study card: box, category pill, title, summary and skill chips. */
const CASE_CARD_CONTROLS: StyleControl[] = [
  { key: 'card_bg', group: 'card_box', type: 'color' },
  { key: 'card_border_color', group: 'card_box', type: 'color' },
  { key: 'card_hover_border_color', group: 'card_box', type: 'color' },
  { key: 'card_border_width', group: 'card_box', type: 'length', min: 0, max: 20 },
  { key: 'card_radius', group: 'card_box', type: 'length', min: 0, max: 100 },
  { key: 'card_padding', group: 'card_box', type: 'length', min: 0, max: 80 },
  { key: 'card_shadow', group: 'card_box', type: 'shadow' },
  { key: 'card_hover_shadow', group: 'card_box', type: 'shadow' },
  { key: 'card_cat_font_size', group: 'card_category', type: 'length', min: 8, max: 32 },
  { key: 'card_cat_font_weight', group: 'card_category', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'card_cat_transform', group: 'card_category', type: 'select', options: TRANSFORM_OPTIONS },
  { key: 'card_cat_letter_spacing', group: 'card_category', type: 'length', min: -5, max: 20 },
  { key: 'card_cat_color', group: 'card_category', type: 'color' },
  { key: 'card_cat_bg', group: 'card_category', type: 'color' },
  { key: 'card_cat_radius', group: 'card_category', type: 'length', min: 0, max: 100 },
  { key: 'card_title_font_size', group: 'card_title', type: 'length', min: 8, max: 64 },
  { key: 'card_title_font_weight', group: 'card_title', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'card_title_line_height', group: 'card_title', type: 'length', min: 0, max: 120 },
  { key: 'card_title_letter_spacing', group: 'card_title', type: 'length', min: -5, max: 20 },
  { key: 'card_title_transform', group: 'card_title', type: 'select', options: TRANSFORM_OPTIONS },
  { key: 'card_title_color', group: 'card_title', type: 'color' },
  { key: 'card_title_hover_color', group: 'card_title', type: 'color' },
  { key: 'card_summary_font_size', group: 'card_summary', type: 'length', min: 8, max: 40 },
  { key: 'card_summary_font_weight', group: 'card_summary', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'card_summary_line_height', group: 'card_summary', type: 'length', min: 0, max: 80 },
  { key: 'card_summary_color', group: 'card_summary', type: 'color' },
  { key: 'card_chip_font_size', group: 'card_chips', type: 'length', min: 8, max: 24 },
  { key: 'card_chip_font_weight', group: 'card_chips', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'card_chip_color', group: 'card_chips', type: 'color' },
  { key: 'card_chip_bg', group: 'card_chips', type: 'color' },
  { key: 'card_chip_border_color', group: 'card_chips', type: 'color' },
  { key: 'card_chip_radius', group: 'card_chips', type: 'length', min: 0, max: 100 },
];

const FONT_STYLE_OPTIONS = [
  { value: 'normal', labelKey: 'builder.style.styleNormal' },
  { value: 'italic', labelKey: 'builder.style.styleItalic' },
];

/** Testimonial card: stars, quote, author name / role, avatar. */
const TESTIMONIAL_CONTROLS: StyleControl[] = [
  { key: 'rating_color', group: 'rating', type: 'color' },
  { key: 'rating_empty_color', group: 'rating', type: 'color' },
  { key: 'rating_size', group: 'rating', type: 'length', min: 8, max: 48 },
  { key: 'quote_font_size', group: 'quote', type: 'length', min: 8, max: 48 },
  { key: 'quote_font_weight', group: 'quote', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'quote_line_height', group: 'quote', type: 'length', min: 0, max: 80 },
  { key: 'quote_letter_spacing', group: 'quote', type: 'length', min: -5, max: 20 },
  { key: 'quote_font_style', group: 'quote', type: 'select', options: FONT_STYLE_OPTIONS },
  { key: 'quote_color', group: 'quote', type: 'color' },
  { key: 'author_name_font_size', group: 'author_name', type: 'length', min: 8, max: 40 },
  { key: 'author_name_font_weight', group: 'author_name', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'author_name_transform', group: 'author_name', type: 'select', options: TRANSFORM_OPTIONS },
  { key: 'author_name_letter_spacing', group: 'author_name', type: 'length', min: -5, max: 20 },
  { key: 'author_name_color', group: 'author_name', type: 'color' },
  { key: 'author_divider_color', group: 'author_name', type: 'color' },
  { key: 'author_meta_font_size', group: 'author_meta', type: 'length', min: 8, max: 32 },
  { key: 'author_meta_font_weight', group: 'author_meta', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'author_meta_color', group: 'author_meta', type: 'color' },
  { key: 'avatar_size', group: 'avatar', type: 'length', min: 16, max: 160 },
  { key: 'avatar_radius', group: 'avatar', type: 'length', min: 0, max: 100 },
  { key: 'avatar_ring_width', group: 'avatar', type: 'length', min: 0, max: 12 },
  { key: 'avatar_ring_color', group: 'avatar', type: 'color' },
];

/** Full button styling for a button part. The card button spans the card, so it has no min width. */
function buttonControls(part: ButtonPart): StyleControl[] {
  const controls: StyleControl[] = [
    { key: `${part}_font_size`, group: part, type: 'length', min: 8, max: 48 },
    { key: `${part}_font_weight`, group: part, type: 'select', options: WEIGHT_OPTIONS },
    { key: `${part}_transform`, group: part, type: 'select', options: TRANSFORM_OPTIONS },
    { key: `${part}_letter_spacing`, group: part, type: 'length', min: -5, max: 20 },
    { key: `${part}_color`, group: part, type: 'color' },
    { key: `${part}_bg`, group: part, type: 'color' },
    { key: `${part}_border_color`, group: part, type: 'color' },
    { key: `${part}_hover_color`, group: part, type: 'color' },
    { key: `${part}_hover_bg`, group: part, type: 'color' },
    { key: `${part}_hover_border_color`, group: part, type: 'color' },
    { key: `${part}_border_width`, group: part, type: 'length', min: 0, max: 20 },
    { key: `${part}_radius`, group: part, type: 'length', min: 0, max: 100 },
    { key: `${part}_padding_y`, group: part, type: 'length', min: 0, max: 80 },
    { key: `${part}_padding_x`, group: part, type: 'length', min: 0, max: 120 },
    { key: `${part}_min_width`, group: part, type: 'length', min: 0, max: 600 },
    { key: `${part}_shadow`, group: part, type: 'shadow' },
    { key: `${part}_hover_shadow`, group: part, type: 'shadow' },
  ];
  return part === 'btn_card' ? controls.filter((c) => c.key !== `${part}_min_width`) : controls;
}

export const STYLE_CONTROLS: StyleControl[] = [
  {
    key: 'type_role',
    group: 'typography',
    type: 'select',
    options: [
      { value: 'heading', labelKey: 'builder.style.roleHeading' },
      { value: 'body', labelKey: 'builder.style.roleBody' },
      { value: 'accent', labelKey: 'builder.style.roleAccent' },
    ],
  },
  { key: 'font_size', group: 'typography', type: 'length', min: 8, max: 120 },
  {
    key: 'font_weight',
    group: 'typography',
    type: 'select',
    options: [
      { value: '400', labelKey: 'builder.style.weightNormal' },
      { value: '600', labelKey: 'builder.style.weightSemibold' },
      { value: '700', labelKey: 'builder.style.weightBold' },
    ],
  },
  { key: 'line_height', group: 'typography', type: 'length', min: 0, max: 80 },
  { key: 'letter_spacing', group: 'typography', type: 'length', min: -5, max: 20 },
  { key: 'text_color', group: 'typography', type: 'color' },
  {
    key: 'text_transform',
    group: 'typography',
    type: 'select',
    options: [
      { value: 'none', labelKey: 'builder.style.transformNone' },
      { value: 'uppercase', labelKey: 'builder.style.transformUpper' },
      { value: 'lowercase', labelKey: 'builder.style.transformLower' },
      { value: 'capitalize', labelKey: 'builder.style.transformCap' },
    ],
  },
  {
    key: 'align',
    group: 'layout',
    type: 'choose',
    options: [
      { value: 'left', labelKey: 'builder.style.alignLeft' },
      { value: 'center', labelKey: 'builder.style.alignCenter' },
      { value: 'right', labelKey: 'builder.style.alignRight' },
    ],
  },
  { key: 'width', group: 'layout', type: 'length', min: 0, max: 2000 },
  { key: 'max_width', group: 'layout', type: 'length', min: 0, max: 2000 },
  { key: 'height', group: 'layout', type: 'length', min: 0, max: 2000 },
  {
    key: 'object_fit',
    group: 'layout',
    type: 'select',
    options: [
      { value: 'cover', labelKey: 'builder.style.fitCover' },
      { value: 'contain', labelKey: 'builder.style.fitContain' },
      { value: 'fill', labelKey: 'builder.style.fitFill' },
      { value: 'none', labelKey: 'builder.style.fitNone' },
      { value: 'scale-down', labelKey: 'builder.style.fitScaleDown' },
    ],
  },
  {
    key: 'object_position',
    group: 'layout',
    type: 'select',
    options: [
      { value: 'center', labelKey: 'builder.style.posCenter' },
      { value: 'top', labelKey: 'builder.style.posTop' },
      { value: 'bottom', labelKey: 'builder.style.posBottom' },
      { value: 'left', labelKey: 'builder.style.posLeft' },
      { value: 'right', labelKey: 'builder.style.posRight' },
      { value: 'top left', labelKey: 'builder.style.posTopLeft' },
      { value: 'top right', labelKey: 'builder.style.posTopRight' },
      { value: 'bottom left', labelKey: 'builder.style.posBottomLeft' },
      { value: 'bottom right', labelKey: 'builder.style.posBottomRight' },
    ],
  },
  {
    key: 'overflow',
    group: 'layout',
    type: 'select',
    options: [
      { value: 'visible', labelKey: 'builder.style.overflowVisible' },
      { value: 'hidden', labelKey: 'builder.style.overflowHidden' },
      { value: 'auto', labelKey: 'builder.style.overflowAuto' },
      { value: 'clip', labelKey: 'builder.style.overflowClip' },
    ],
  },
  { key: 'z_index', group: 'layout', type: 'number', min: -9999, max: 9999 },
  { key: 'margin', group: 'spacing', type: 'dimensions' },
  { key: 'padding', group: 'spacing', type: 'dimensions' },
  { key: 'opacity', group: 'image', type: 'slider', min: 0, max: 1, step: 0.05 },
  { key: 'filters', group: 'image', type: 'filters' },
  {
    key: 'border_style',
    group: 'border',
    type: 'select',
    options: [
      { value: 'none', labelKey: 'builder.style.borderNone' },
      { value: 'solid', labelKey: 'builder.style.borderSolid' },
      { value: 'dashed', labelKey: 'builder.style.borderDashed' },
      { value: 'dotted', labelKey: 'builder.style.borderDotted' },
      { value: 'double', labelKey: 'builder.style.borderDouble' },
    ],
  },
  { key: 'border_width', group: 'border', type: 'length', min: 0, max: 80 },
  { key: 'border_color', group: 'border', type: 'color' },
  { key: 'radius', group: 'border', type: 'length', min: 0, max: 400 },
  { key: 'box_shadow', group: 'border', type: 'shadow' },
  { key: 'hover_opacity', group: 'hover', type: 'slider', min: 0, max: 1, step: 0.05 },
  { key: 'hover_filters', group: 'hover', type: 'filters' },
  { key: 'hover_transition', group: 'hover', type: 'number', min: 0, max: 5000 },
  {
    key: 'hover_animation',
    group: 'hover',
    type: 'select',
    options: [
      { value: 'none', labelKey: 'builder.style.animNone' },
      { value: 'grow', labelKey: 'builder.style.animGrow' },
      { value: 'shrink', labelKey: 'builder.style.animShrink' },
      { value: 'float', labelKey: 'builder.style.animFloat' },
      { value: 'sink', labelKey: 'builder.style.animSink' },
    ],
  },
  { key: 'hover_box_shadow', group: 'hover', type: 'shadow' },
  {
    key: 'caption_align',
    group: 'caption',
    type: 'choose',
    options: [
      { value: 'left', labelKey: 'builder.style.alignLeft' },
      { value: 'center', labelKey: 'builder.style.alignCenter' },
      { value: 'right', labelKey: 'builder.style.alignRight' },
    ],
  },
  { key: 'caption_color', group: 'caption', type: 'color' },
  { key: 'caption_font_size', group: 'caption', type: 'length', min: 8, max: 72 },
  {
    key: 'caption_font_weight',
    group: 'caption',
    type: 'select',
    options: [
      { value: '400', labelKey: 'builder.style.weightNormal' },
      { value: '500', labelKey: 'builder.style.weightMedium' },
      { value: '600', labelKey: 'builder.style.weightSemibold' },
      { value: '700', labelKey: 'builder.style.weightBold' },
    ],
  },
  {
    key: 'caption_transform',
    group: 'caption',
    type: 'select',
    options: [
      { value: 'none', labelKey: 'builder.style.transformNone' },
      { value: 'uppercase', labelKey: 'builder.style.transformUpper' },
      { value: 'lowercase', labelKey: 'builder.style.transformLower' },
      { value: 'capitalize', labelKey: 'builder.style.transformCap' },
    ],
  },
  {
    key: 'caption_font_style',
    group: 'caption',
    type: 'select',
    options: [
      { value: 'normal', labelKey: 'builder.style.styleNormal' },
      { value: 'italic', labelKey: 'builder.style.styleItalic' },
    ],
  },
  {
    key: 'caption_decoration',
    group: 'caption',
    type: 'select',
    options: [
      { value: 'none', labelKey: 'builder.style.decoNone' },
      { value: 'underline', labelKey: 'builder.style.decoUnderline' },
      { value: 'line-through', labelKey: 'builder.style.decoStrike' },
    ],
  },
  { key: 'caption_line_height', group: 'caption', type: 'length', min: 0, max: 80 },
  { key: 'caption_letter_spacing', group: 'caption', type: 'length', min: -5, max: 20 },
  { key: 'caption_spacing', group: 'caption', type: 'length', min: 0, max: 80 },
  ...sectionTextControls('title', 120),
  ...sectionTextControls('subtitle', 64),
  ...buttonControls('btn_primary'),
  ...buttonControls('btn_secondary'),
  { key: 'tab_font_size', group: 'tabs', type: 'length', min: 8, max: 48 },
  { key: 'tab_font_weight', group: 'tabs', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'tab_color', group: 'tabs', type: 'color' },
  { key: 'tab_bg', group: 'tabs', type: 'color' },
  { key: 'tab_hover_color', group: 'tabs', type: 'color' },
  { key: 'tab_hover_bg', group: 'tabs', type: 'color' },
  { key: 'tab_active_color', group: 'tabs', type: 'color' },
  { key: 'tab_active_bg', group: 'tabs', type: 'color' },
  { key: 'tab_indicator_color', group: 'tabs', type: 'color' },
  { key: 'tab_radius', group: 'tabs', type: 'length', min: 0, max: 100 },
  { key: 'nav_size', group: 'nav_buttons', type: 'length', min: 20, max: 96 },
  { key: 'nav_icon_size', group: 'nav_buttons', type: 'length', min: 8, max: 64 },
  { key: 'nav_color', group: 'nav_buttons', type: 'color' },
  { key: 'nav_bg', group: 'nav_buttons', type: 'color' },
  { key: 'nav_border_color', group: 'nav_buttons', type: 'color' },
  { key: 'nav_hover_color', group: 'nav_buttons', type: 'color' },
  { key: 'nav_hover_bg', group: 'nav_buttons', type: 'color' },
  { key: 'nav_radius', group: 'nav_buttons', type: 'length', min: 0, max: 100 },
  { key: 'link_font_size', group: 'link', type: 'length', min: 8, max: 48 },
  { key: 'link_font_weight', group: 'link', type: 'select', options: WEIGHT_OPTIONS },
  { key: 'link_transform', group: 'link', type: 'select', options: TRANSFORM_OPTIONS },
  { key: 'link_letter_spacing', group: 'link', type: 'length', min: -5, max: 20 },
  { key: 'link_color', group: 'link', type: 'color' },
  { key: 'link_hover_color', group: 'link', type: 'color' },
  ...CASE_CARD_CONTROLS,
  ...buttonControls('btn_card'),
  ...TESTIMONIAL_CONTROLS,
  { key: 'custom_css', group: 'custom', type: 'textarea' },
];

export function controlsForWidget(type: string): StyleControl[] {
  const groups = new Set(widgetStyleGroups(type));
  if (groups.size === 0) return [];
  const hasMedia = widgetHasMediaStyleChrome(type);
  return STYLE_CONTROLS.filter((c) => {
    if (!groups.has(c.group as StyleGroupId)) return false;
    if (!hasMedia && MEDIA_ONLY_STYLE_KEYS.has(c.key)) return false;
    return true;
  });
}

export function readLength(value: unknown): StyleLength | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('unit' in value) || !('value' in value)) return null;
  return value as StyleLength;
}

export function readDimensions(value: unknown): StyleDimensions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('top' in value) || !('unit' in value)) return null;
  return value as StyleDimensions;
}

export function readFilters(value: unknown): StyleFilters | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('blur' in value) || !('brightness' in value)) return null;
  return value as StyleFilters;
}

export function readShadow(value: unknown): StyleShadow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('blur' in value) || !('h' in value) || !('color' in value)) return null;
  return value as StyleShadow;
}

export function patchStyleBag(
  styles: BuilderStyles | null | undefined,
  device: StyleBreakpoint,
  key: string,
  value: unknown,
): BuilderStyles {
  const next: BuilderStyles = {
    desktop: { ...(styles?.desktop ?? {}) },
    tablet: { ...(styles?.tablet ?? {}) },
    mobile: { ...(styles?.mobile ?? {}) },
  };
  const bag = { ...(next[device] ?? {}) };
  if (value === undefined || value === null || value === '') {
    delete bag[key];
  } else {
    bag[key] = value;
  }
  if (Object.keys(bag).length === 0) {
    delete next[device];
  } else {
    next[device] = bag;
  }
  if (!next.desktop || Object.keys(next.desktop).length === 0) delete next.desktop;
  if (!next.tablet || Object.keys(next.tablet).length === 0) delete next.tablet;
  if (!next.mobile || Object.keys(next.mobile).length === 0) delete next.mobile;
  return next;
}

export function inheritedValue(
  styles: BuilderStyles | null | undefined,
  device: StyleBreakpoint,
  key: string,
): unknown {
  if (device === 'desktop') return styles?.desktop?.[key];
  if (device === 'tablet') {
    if (styles?.tablet && key in styles.tablet) return styles.tablet[key];
    return styles?.desktop?.[key];
  }
  if (styles?.mobile && key in styles.mobile) return styles.mobile[key];
  if (styles?.tablet && key in styles.tablet) return styles.tablet[key];
  return styles?.desktop?.[key];
}

export function isOverride(
  styles: BuilderStyles | null | undefined,
  device: StyleBreakpoint,
  key: string,
): boolean {
  const bag = styles?.[device];
  return !!bag && Object.prototype.hasOwnProperty.call(bag, key);
}
