/**
 * `icon` control values (mirrors backend IconValueNormalizer).
 * Icons render as inline SVG from the saved body, so the public site loads no icon fonts,
 * CDN scripts or third-party requests.
 */

export const ICON_SET_LIBRARIES = ['lucide', 'simple-icons'] as const;

export type IconSetLibrary = (typeof ICON_SET_LIBRARIES)[number];

function isIconSetLibrary(value: unknown): value is IconSetLibrary {
  return typeof value === 'string' && (ICON_SET_LIBRARIES as readonly string[]).includes(value);
}

export type SetIconValue = {
  library: IconSetLibrary;
  name: string;
  body: string;
  view_box: string;
  /** Hex colour applied through `currentColor`; unset inherits the surrounding text colour. */
  color?: string;
  /** Pixel size chosen in the picker; overrides the widget's default size. */
  size?: number;
};

export type UploadedIconValue = {
  library: 'svg';
  media_id: number;
  url: string;
  size?: number;
};

export type IconValue = SetIconValue | UploadedIconValue;

const DEFAULT_VIEW_BOX = '0 0 24 24';
const MAX_BODY_LENGTH = 20000;
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"';

/** Bodies for names saved before the icon library existed (Lucide equivalents). */
const LEGACY_ICON_BODIES: Record<string, string> = {
  star: `<path ${STROKE} d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/>`,
  check: `<path ${STROKE} d="M20 6L9 17l-5-5"/>`,
  heart: `<path ${STROKE} d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>`,
  arrow: `<path ${STROKE} d="M5 12h14m-7-7l7 7l-7 7"/>`,
  play: `<path ${STROKE} d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>`,
  mail: `<g ${STROKE}><path d="m22 7l-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></g>`,
  phone: `<path ${STROKE} d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233a14 14 0 0 0 6.392 6.384"/>`,
  quote: `<path ${STROKE} d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2zM5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>`,
};

const ALLOWED_TAGS = new Set(['g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
const ALLOWED_ATTRIBUTES = new Set([
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
]);
const TAG_RE = /<\/?([a-zA-Z][\w-]*)((?:\s+[a-zA-Z][\w:-]*\s*=\s*"[^"<>]*")*)\s*\/?>/g;
const ATTR_RE = /([a-zA-Z][\w:-]*)\s*=\s*"([^"<>]*)"/g;
const UNSAFE_VALUE_RE = /url\s*\(|javascript\s*:|expression\s*\(/i;
const ICON_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Same bounds as backend `IconValueNormalizer::SIZE_MIN` / `SIZE_MAX`. */
export const ICON_SIZE_MIN = 8;
export const ICON_SIZE_MAX = 256;

/** Whole-pixel icon size within bounds, or undefined when unset / not numeric. */
export function normalizeIconSize(raw: unknown): number | undefined {
  if (raw === '' || raw === null || typeof raw === 'boolean') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(ICON_SIZE_MAX, Math.max(ICON_SIZE_MIN, Math.round(n))) : undefined;
}

/** Only hex colours reach the SVG style attribute. */
export function isSafeIconColor(color: unknown): color is string {
  return typeof color === 'string' && ICON_COLOR_RE.test(color.trim());
}

/** Strict allowlist check before a body is injected as inline SVG. */
export function isSafeIconBody(body: string): boolean {
  if (!body || body.length > MAX_BODY_LENGTH) return false;
  let safe = true;
  const rest = body.replace(TAG_RE, (_m, tag: string, attrs: string) => {
    if (!ALLOWED_TAGS.has(tag.toLowerCase())) safe = false;
    for (const [, name, value] of attrs.matchAll(ATTR_RE)) {
      if (!ALLOWED_ATTRIBUTES.has(name.toLowerCase()) || UNSAFE_VALUE_RE.test(value)) safe = false;
    }
    return '';
  });
  return safe && rest.trim() === '';
}

/** Scheme guard only; the backend re-reads upload URLs from our own media table on save. */
function isHttpOrRootUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));
}

/** Normalize a stored icon setting; returns null when there is nothing safe to render. */
export function parseIconValue(raw: unknown): IconValue | null {
  if (typeof raw === 'string') {
    const body = LEGACY_ICON_BODIES[raw.trim().toLowerCase()];
    return body ? { library: 'lucide', name: raw.trim().toLowerCase(), body, view_box: DEFAULT_VIEW_BOX } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (v.library === 'svg') {
    const url = typeof v.url === 'string' ? v.url.trim() : '';
    const id = Number(v.media_id);
    if (!url || !Number.isInteger(id) || id < 1 || !isHttpOrRootUrl(url)) return null;
    const upload: UploadedIconValue = { library: 'svg', media_id: id, url };
    const uploadSize = normalizeIconSize(v.size);
    if (uploadSize) upload.size = uploadSize;
    return upload;
  }
  if (isIconSetLibrary(v.library)) {
    const body = typeof v.body === 'string' ? v.body.trim() : '';
    if (!isSafeIconBody(body)) return null;
    const viewBox = typeof v.view_box === 'string' && /^-?[\d.]+( -?[\d.]+){3}$/.test(v.view_box) ? v.view_box : DEFAULT_VIEW_BOX;
    const icon: SetIconValue = { library: v.library, name: String(v.name ?? ''), body, view_box: viewBox };
    if (isSafeIconColor(v.color)) icon.color = v.color.trim().toLowerCase();
    const size = normalizeIconSize(v.size);
    if (size) icon.size = size;
    return icon;
  }
  return null;
}

/** Short label for admin previews. */
export function iconValueLabel(value: IconValue | null): string {
  if (!value) return '';
  return value.library === 'svg' ? value.url.split('/').pop() || 'SVG' : value.name;
}
