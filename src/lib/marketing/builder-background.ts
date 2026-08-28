/**
 * Page builder band / row / column backgrounds (Elementor-style + particles + animated rain).
 */

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
  image_size?: 'cover' | 'contain' | 'auto';
  image_position?: string;
  image_repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
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
    return {
      backgroundImage: `url("${bg.image_url.replace(/"/g, '\\"')}")`,
      backgroundSize: bg.image_size || 'cover',
      backgroundPosition: bg.image_position || 'center',
      backgroundRepeat: bg.image_repeat || 'no-repeat',
    };
  }
  return null;
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
