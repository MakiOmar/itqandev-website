/**
 * Resolve Appearance hero particle settings into canvas knobs.
 */

export type HeroParticlesConfig = {
  density: number;
  speed: number;
  opacity: number;
  size: number;
  /** Empty = theme-aware colors. */
  color: string;
};

export const DEFAULT_HERO_PARTICLES: HeroParticlesConfig = {
  density: 50,
  speed: 40,
  opacity: 55,
  size: 40,
  color: '',
};

function clampScale(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.round(n)));
}

export function normalizeHexColor(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
    return v.toLowerCase();
  }
  return '';
}

export function resolveHeroParticlesConfig(
  settings: Record<string, unknown> | undefined,
): HeroParticlesConfig {
  return {
    density: clampScale(settings?.particles_density, DEFAULT_HERO_PARTICLES.density),
    speed: clampScale(settings?.particles_speed, DEFAULT_HERO_PARTICLES.speed),
    opacity: clampScale(settings?.particles_opacity, DEFAULT_HERO_PARTICLES.opacity),
    size: clampScale(settings?.particles_size, DEFAULT_HERO_PARTICLES.size),
    color: normalizeHexColor(settings?.particles_color),
  };
}

/** Map 1–100 density to pixel-area divisor (higher density → more particles). */
export function densityToDivisor(density: number): number {
  const d = clampScale(density, 50);
  return Math.round(44000 - (d / 100) * 36000);
}

/** Base velocity spread; 40 ≈ legacy 0.28. */
export function speedToVelocity(speed: number): number {
  const s = clampScale(speed, 40);
  return (s / 40) * 0.28;
}

export function sizeToRadiusScale(size: number): number {
  return clampScale(size, 40) / 40;
}

export function opacityToAlphaScale(opacity: number): number {
  return clampScale(opacity, 55) / 55;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  let h = normalized.slice(1);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
