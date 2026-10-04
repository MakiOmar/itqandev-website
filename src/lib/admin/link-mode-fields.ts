/**
 * Elementor-style "Link" select for widgets that store a URL, a new-tab flag and a lightbox flag
 * as separate settings (e.g. the image widget). Saved keys stay unchanged; the inspector only
 * presents them as one None / Custom URL / Lightbox control.
 */

type FieldLike = { key: string };

export const LINK_MODE_KEYS = {
  url: 'link_url',
  newTab: 'open_in_new_tab',
  lightbox: 'lightbox',
} as const;

export type LinkMode = 'none' | 'custom' | 'lightbox';

export function hasLinkModeFields(fields: readonly FieldLike[]): boolean {
  const keys = new Set(fields.map((f) => f.key));
  return Object.values(LINK_MODE_KEYS).every((k) => keys.has(k));
}

/** New-tab and lightbox switches render inside the Link control, not as their own rows. */
export function isFoldedLinkModeField(field: FieldLike, linkMode: boolean): boolean {
  return linkMode && (field.key === LINK_MODE_KEYS.newTab || field.key === LINK_MODE_KEYS.lightbox);
}

export function isTruthySetting(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** Mode shown for stored values; `pendingCustom` keeps "Custom URL" open while the URL is still empty. */
export function resolveLinkMode(url: string, lightbox: boolean, pendingCustom: boolean): LinkMode {
  if (lightbox) return 'lightbox';
  return url.trim() !== '' || pendingCustom ? 'custom' : 'none';
}

/** Settings patch for a newly chosen mode. Lightbox keeps the URL so switching back is lossless. */
export function linkModePatch(mode: LinkMode): Record<string, unknown> {
  if (mode === 'none') return { [LINK_MODE_KEYS.url]: '', [LINK_MODE_KEYS.lightbox]: false };
  return { [LINK_MODE_KEYS.lightbox]: mode === 'lightbox' };
}
