/**
 * Page builder band / row / column backgrounds (Elementor-style + particles + animated rain).
 */
import { resolveLaravelMediaUrl } from './resolve-laravel-media-url';

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
};

export const DEFAULT_BUILDER_BACKGROUND: BuilderBackground = { type: 'none' };

export const LAZY_BACKGROUND_VAR = '--bg-lazy-image';

export function isLazyImageBackground(bg: BuilderBackground): boolean {
  return bg.type === 'image' && Boolean(bg.image_url) && bg.image_lazy !== false;
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
  };
}

export function builderBackgroundInlineStyle(bg: BuilderBackground): Record<string, string> | null {
  if (bg.type === 'color' && bg.color) {
    return { backgroundColor: bg.color };
  }
  if (bg.type === 'gradient') {
    const from = bg.gradient_from || '#0389a1';
    const to = bg.gradient_to || '#0ea5e9';
    const angle = bg.gradient_angle ?? 135;
    return {
      backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
    };
  }
  if (bg.type === 'image' && bg.image_url) {
    const url = resolveLaravelMediaUrl(bg.image_url) || bg.image_url;
    const image = `url("${url.replace(/"/g, '\\"')}")`;
    return {
      // Lazy: the URL waits in a custom property (not fetched) until LazyBackgroundImage applies it.
      ...(bg.image_lazy === false ? { backgroundImage: image } : { [LAZY_BACKGROUND_VAR]: image }),
      backgroundSize: bg.image_size || 'cover',
      backgroundPosition: bg.image_position || 'center',
      backgroundRepeat: bg.image_repeat || 'no-repeat',
    };
  }
  return null;
}

/** Overlay layer over an image background, or null when it is off / fully transparent. */
export function builderBackgroundOverlayStyle(bg: BuilderBackground): Record<string, string> | null {
  if (bg.type !== 'image' || !bg.image_url || !bg.overlay) return null;
  const opacity = bg.overlay_opacity ?? 50;
  if (opacity <= 0) return null;
  return {
    backgroundColor: bg.overlay_color || '#000000',
    opacity: String(opacity / 100),
  };
}

export function hasInteractiveBackground(bg: BuilderBackground): boolean {
  return bg.type === 'particles' || bg.type === 'animated_rain';
}

export function hasVisibleBackground(bg: BuilderBackground): boolean {
  if (bg.type === 'none') return false;
  if (bg.type === 'color') return Boolean(bg.color);
  if (bg.type === 'image') return Boolean(bg.image_url);
  return true;
}
