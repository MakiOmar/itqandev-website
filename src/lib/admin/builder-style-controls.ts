/**
 * Admin Style-tab catalog. Public render uses ~/lib/marketing/builder-styles only.
 */
import {
  widgetStyleGroups,
  type BuilderStyles,
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

export const STYLE_CONTROLS: StyleControl[] = [
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
  { key: 'custom_css', group: 'custom', type: 'textarea' },
];

export function controlsForWidget(type: string): StyleControl[] {
  const groups = new Set(widgetStyleGroups(type));
  if (groups.size === 0) return [];
  return STYLE_CONTROLS.filter((c) => groups.has(c.group as StyleGroupId));
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
