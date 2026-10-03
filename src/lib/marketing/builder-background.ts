/**
 * Page builder band / row / column backgrounds (Elementor-style + particles + animated rain).
 */
import { resolveLaravelMediaUrl } from './resolve-laravel-media-url';
import { safeCssColor } from './builder-dark-styles';
import { DARK_SCOPE_SELECTOR } from '~/lib/theme/theme-scope';

export type BuilderBackgroundType =
  | 'none'
  | 'color'
  | 'gradient'
  | 'image'
  | 'particles'
  | 'animated_rain';

export type BuilderBackground = {
  type: BuilderBackgroundType;
  color?: string;
  gradient_from?: string;
  gradient_to?: string;
  gradient_angle?: number;
  image_url?: string;
  /** Media library id of the image (the URL is stored alongside so rendering needs no lookup). */
  image_id?: number;
  /** Defer the download until the band is near the viewport (default on; stored only as `false`). */
  image_lazy?: boolean;
  image_size?: 'cover' | 'contain' | 'auto';
  image_position?: string;
  image_repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  /** Colour layer painted over the image; opacity is 0–100. */
  overlay?: boolean;
  overlay_color?: string;
  overlay_opacity?: number;
  particles_density?: number;
  particles_speed?: number;
  particles_opacity?: number;
  particles_size?: number;
  particles_color?: string;
  rain_color?: string;
  rain_speed?: number;
  rain_density?: number;
  rain_direction?: 'down' | 'up' | 'both';
  /** Frosted-glass blur (px, 0–40) of what sits behind the node; 0 = off. */
  backdrop_blur?: number;
  /** Dark-mode colour (and image) overrides; unset keys keep the light value. */
  dark?: BuilderBackgroundDark;
};

export const MAX_BACKDROP_BLUR = 40;

export type BuilderBackgroundDark = {
  color?: string;
  gradient_from?: string;
  gradient_to?: string;
  image_url?: string;
  image_id?: number;
  overlay_color?: string;
  overlay_opacity?: number;
  particles_color?: string;
  rain_color?: string;
};

const DARK_STRING_KEYS = [
  'color', 'gradient_from', 'gradient_to', 'image_url', 'overlay_color', 'particles_color', 'rain_color',
] as const;

export const DEFAULT_BUILDER_BACKGROUND: BuilderBackground = { type: 'none' };

export const LAZY_BACKGROUND_VAR = '--bg-lazy-image';

export function isLazyImageBackground(bg: BuilderBackground): boolean {
  return bg.type === 'image' && Boolean(bg.image_url || bg.dark?.image_url) && bg.image_lazy !== false;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function readBuilderBackground(settings: Record<string, unknown> | undefined): BuilderBackground {
  const raw = settings?.background;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_BUILDER_BACKGROUND };
  }
  const row = raw as Record<string, unknown>;
  const typeRaw = String(row.type ?? 'none');
  const allowed: BuilderBackgroundType[] = [
    'none',
    'color',
    'gradient',
    'image',
    'particles',
    'animated_rain',
  ];
  const type = allowed.includes(typeRaw as BuilderBackgroundType)
    ? (typeRaw as BuilderBackgroundType)
    : 'none';

  return {
    type,
    color: typeof row.color === 'string' ? row.color : undefined,
    gradient_from: typeof row.gradient_from === 'string' ? row.gradient_from : '#0389a1',
    gradient_to: typeof row.gradient_to === 'string' ? row.gradient_to : '#0ea5e9',
    gradient_angle: clampNum(row.gradient_angle, 0, 360, 135),
    image_url: typeof row.image_url === 'string' ? row.image_url : undefined,
    image_size:
      row.image_size === 'contain' || row.image_size === 'auto' ? row.image_size : 'cover',
    image_position: typeof row.image_position === 'string' ? row.image_position : 'center',
    image_repeat:
      row.image_repeat === 'repeat' ||
      row.image_repeat === 'repeat-x' ||
      row.image_repeat === 'repeat-y'
        ? row.image_repeat
        : 'no-repeat',
    image_id: typeof row.image_id === 'number' && row.image_id > 0 ? row.image_id : undefined,
    image_lazy: row.image_lazy !== false,
    overlay: row.overlay === true,
    overlay_color: typeof row.overlay_color === 'string' && row.overlay_color ? row.overlay_color : '#000000',
    overlay_opacity: clampNum(row.overlay_opacity, 0, 100, 50),
    particles_density: clampNum(row.particles_density, 10, 100, 50),
    particles_speed: clampNum(row.particles_speed, 10, 100, 40),
    particles_opacity: clampNum(row.particles_opacity, 10, 100, 55),
    particles_size: clampNum(row.particles_size, 10, 100, 40),
    particles_color: typeof row.particles_color === 'string' ? row.particles_color : '',
    rain_color: typeof row.rain_color === 'string' ? row.rain_color : '',
    rain_speed: clampNum(row.rain_speed, 10, 100, 45),
    rain_density: clampNum(row.rain_density, 10, 100, 50),
    rain_direction:
      row.rain_direction === 'up' || row.rain_direction === 'both' ? row.rain_direction : 'down',
    backdrop_blur: clampNum(row.backdrop_blur, 0, MAX_BACKDROP_BLUR, 0),
    dark: readBackgroundDark(row.dark),
  };
}

function readBackgroundDark(raw: unknown): BuilderBackgroundDark | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const out: BuilderBackgroundDark = {};
  for (const key of DARK_STRING_KEYS) {
    const v = row[key];
    if (typeof v === 'string' && v.trim() !== '') out[key] = v.trim();
  }
  if (typeof row.image_id === 'number' && row.image_id > 0) out.image_id = row.image_id;
  if (typeof row.overlay_opacity === 'number') out.overlay_opacity = clampNum(row.overlay_opacity, 0, 100, 50);
  return Object.keys(out).length > 0 ? out : undefined;
}

/** `url("…")` for a stored image path, or null when it could break out of a CSS string. */
function cssImageUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const url = resolveLaravelMediaUrl(raw) || raw;
  if (/[<>"'\\\n\r\u0000-\u001f]/.test(url)) return null;
  return `url("${url}")`;
}

function gradientCss(angle: number, from: string, to: string): string {
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

/**
 * Custom properties for the background layer root. Paint and overlay children read them via
 * `var()`, so `builderDarkBackgroundCss` can swap values for the dark theme scope.
 * Lazy images keep their URL in `LAZY_BACKGROUND_VAR` until LazyBackgroundImage applies it.
 */
export function builderBackgroundVars(bg: BuilderBackground): Record<string, string> {
  if (bg.type === 'color' && bg.color) return { '--bg-color': bg.color };
  if (bg.type === 'gradient') {
    return {
      '--bg-image': gradientCss(bg.gradient_angle ?? 135, bg.gradient_from || '#0389a1', bg.gradient_to || '#0ea5e9'),
    };
  }
  if (bg.type !== 'image') return {};
  const vars: Record<string, string> = {};
  const image = cssImageUrl(bg.image_url);
  if (image) vars[bg.image_lazy === false ? '--bg-image' : LAZY_BACKGROUND_VAR] = image;
  if (bg.overlay) {
    vars['--bg-overlay'] = bg.overlay_color || '#000000';
    vars['--bg-overlay-opacity'] = String((bg.overlay_opacity ?? 50) / 100);
  }
  return vars;
}

/** Paint layer style (reads the layer vars), or null when the type has no CSS paint. */
export function builderBackgroundPaintStyle(bg: BuilderBackground): Record<string, string> | null {
  if (bg.type === 'color') return { backgroundColor: 'var(--bg-color)' };
  if (bg.type === 'gradient') return { backgroundImage: 'var(--bg-image)' };
  if (bg.type !== 'image') return null;
  return {
    // Lazy layers get `background-image: var(LAZY_BACKGROUND_VAR)` from LazyBackgroundImage once in view.
    ...(bg.image_lazy === false ? { backgroundImage: 'var(--bg-image)' } : {}),
    backgroundSize: bg.image_size || 'cover',
    backgroundPosition: bg.image_position || 'center',
    backgroundRepeat: bg.image_repeat || 'no-repeat',
  };
}

/** Overlay layer over an image background, or null when it is off / transparent in both modes. */
export function builderBackgroundOverlayStyle(bg: BuilderBackground): Record<string, string> | null {
  if (bg.type !== 'image' || !bg.overlay) return null;
  if (!bg.image_url && !bg.dark?.image_url) return null;
  if ((bg.overlay_opacity ?? 50) <= 0 && (bg.dark?.overlay_opacity ?? 0) <= 0) return null;
  return { backgroundColor: 'var(--bg-overlay)', opacity: 'var(--bg-overlay-opacity)' };
}

/**
 * Backdrop blur for the background layer. It sits on the layer, not the node, because
 * `backdrop-filter` on an ancestor traps `position: fixed` children (e.g. the mobile menu panel).
 */
export function builderBackgroundBackdropStyle(bg: BuilderBackground): Record<string, string> | null {
  const blur = bg.backdrop_blur ?? 0;
  if (blur <= 0) return null;
  return { backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` };
}

export function builderBackgroundLayerId(nodeId: string): string {
  return `bg-${String(nodeId || 'x').replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/** Scoped `<style>` body swapping the layer vars in dark mode, or null without valid overrides. */
export function builderDarkBackgroundCss(layerId: string, bg: BuilderBackground): string | null {
  const dark = bg.dark;
  if (!dark) return null;
  const vars: Record<string, string> = {};
  if (bg.type === 'color') {
    const color = safeCssColor(dark.color);
    if (color) vars['--bg-color'] = color;
  } else if (bg.type === 'gradient' && (dark.gradient_from || dark.gradient_to)) {
    const from = safeCssColor(dark.gradient_from ?? bg.gradient_from);
    const to = safeCssColor(dark.gradient_to ?? bg.gradient_to);
    if (from && to) vars['--bg-image'] = gradientCss(bg.gradient_angle ?? 135, from, to);
  } else if (bg.type === 'image') {
    const image = cssImageUrl(dark.image_url);
    if (image) vars[bg.image_lazy === false ? '--bg-image' : LAZY_BACKGROUND_VAR] = image;
    const overlay = safeCssColor(dark.overlay_color);
    if (bg.overlay && overlay) vars['--bg-overlay'] = overlay;
    if (bg.overlay && typeof dark.overlay_opacity === 'number') {
      vars['--bg-overlay-opacity'] = String(dark.overlay_opacity / 100);
    }
  }
  const decls = Object.entries(vars).map(([name, value]) => `${name}:${value}!important`);
  if (decls.length === 0) return null;
  return `#${layerId}${DARK_SCOPE_SELECTOR}{${decls.join(';')}}`;
}

export function hasInteractiveBackground(bg: BuilderBackground): boolean {
  return bg.type === 'particles' || bg.type === 'animated_rain';
}

export function hasVisibleBackground(bg: BuilderBackground): boolean {
  if (bg.type === 'none') return false;
  if (bg.type === 'color') return Boolean(bg.color || bg.dark?.color);
  if (bg.type === 'image') return Boolean(bg.image_url || bg.dark?.image_url);
  return true;
}
