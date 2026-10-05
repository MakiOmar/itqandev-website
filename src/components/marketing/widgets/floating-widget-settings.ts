/** Setting readers shared by widgets that can float in a screen corner (theme switch, floating contact). */

export type FloatingCorner = 'bottom_end' | 'bottom_start' | 'top_end' | 'top_start';

const CORNERS: ReadonlySet<string> = new Set(['bottom_end', 'bottom_start', 'top_end', 'top_start']);

export function floatingCorner(value: unknown): FloatingCorner {
  return typeof value === 'string' && CORNERS.has(value) ? (value as FloatingCorner) : 'bottom_end';
}

/** Offset from the viewport edge in px, clamped to the registry range (0–200). */
export function floatingOffset(value: unknown, fallback = 24): number {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return fallback;
  return Math.min(200, Math.max(0, Math.round(n)));
}

export function settingBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function settingText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** wa.me chat link; null without a usable international number. */
export function whatsappHref(number: unknown, message: string): string | null {
  const digits = String(number ?? '').replace(/\D+/g, '').slice(0, 15);
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
