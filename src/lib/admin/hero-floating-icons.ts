/**
 * Helpers for homepage hero floating icons (admin + light client normalize).
 */

import type { HeroFloatingIcon, HeroFloatingIconMotion } from '../marketing/appearance-types';

export const HERO_FLOATING_ICON_MOTIONS: HeroFloatingIconMotion[] = ['rotate', 'diagonal', 'bounce'];

export const HERO_FLOATING_ICONS_MAX = 24;

/** Percent of image box; below 0 / above 100 hangs outside the media edge. */
export const HERO_FLOATING_POSITION_MIN = -20;
export const HERO_FLOATING_POSITION_MAX = 120;

export function newHeroFloatingIconId(): string {
  return `icon_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeHeroFloatingIcons(raw: unknown): HeroFloatingIcon[] {
  if (!Array.isArray(raw)) return [];
  const out: HeroFloatingIcon[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (out.length >= HERO_FLOATING_ICONS_MAX) break;
    const r = row as Record<string, unknown>;
    const id =
      typeof r.id === 'string' && r.id.trim()
        ? r.id.trim()
        : newHeroFloatingIconId();
    let mediaId: number | null = null;
    if (typeof r.media_id === 'number' && Number.isInteger(r.media_id) && r.media_id > 0) {
      mediaId = r.media_id;
    } else if (typeof r.media_id === 'string' && /^\d+$/.test(r.media_id.trim())) {
      mediaId = Number(r.media_id.trim());
    }
    let motion = String(r.motion || 'rotate').toLowerCase();
    if (!HERO_FLOATING_ICON_MOTIONS.includes(motion as HeroFloatingIconMotion)) {
      motion = 'rotate';
    }
    const x = clampPercent(r.x ?? 12);
    const y = clampPercent(r.y ?? 18);
    let size = typeof r.size === 'number' ? Math.floor(r.size) : Number(r.size);
    if (!Number.isFinite(size)) size = 56;
    size = Math.max(32, Math.min(120, size));
    out.push({
      id,
      enabled: r.enabled !== false && r.enabled !== 'false' && r.enabled !== 0,
      media_id: mediaId,
      url: typeof r.url === 'string' ? r.url : undefined,
      alt: typeof r.alt === 'string' ? r.alt : null,
      motion: motion as HeroFloatingIconMotion,
      x,
      y,
      size,
    });
  }
  return out;
}

function clampPercent(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return (
    Math.round(
      Math.max(HERO_FLOATING_POSITION_MIN, Math.min(HERO_FLOATING_POSITION_MAX, n)) * 100,
    ) / 100
  );
}

export function defaultHeroFloatingIcon(partial?: Partial<HeroFloatingIcon>): HeroFloatingIcon {
  // Prefer edge placements: slight negative / >100 = outside; low teens = just inside.
  const presets: Array<Pick<HeroFloatingIcon, 'x' | 'y' | 'motion'>> = [
    { x: -6, y: 18, motion: 'rotate' },
    { x: 106, y: 22, motion: 'diagonal' },
    { x: 8, y: 78, motion: 'bounce' },
    { x: 94, y: -4, motion: 'rotate' },
    { x: -4, y: 52, motion: 'diagonal' },
    { x: 104, y: 68, motion: 'bounce' },
  ];
  const i = Math.floor(Math.random() * presets.length);
  const preset = presets[i]!;
  return {
    id: newHeroFloatingIconId(),
    enabled: true,
    media_id: null,
    motion: preset.motion,
    x: preset.x,
    y: preset.y,
    size: 56,
    ...partial,
  };
}
