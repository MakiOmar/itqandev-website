/**
 * Appearance builder media field values: library media id (number) or legacy URL/path string.
 */

export function isAppearanceMediaId(value: unknown): boolean {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return true;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    return /^\d+$/.test(t) && Number(t) > 0;
  }
  return false;
}

export function appearanceMediaId(value: unknown): number | null {
  if (!isAppearanceMediaId(value)) {
    return null;
  }
  return typeof value === 'number' ? value : Number(String(value).trim());
}

/** Preview src for admin UI (URL string or cached URL for a media id). */
export function appearanceMediaPreviewSrc(
  value: unknown,
  urlById?: Record<string, string> | null,
): string {
  if (value == null || value === '') {
    return '';
  }
  const id = appearanceMediaId(value);
  if (id !== null) {
    const fromCache = urlById?.[String(id)]?.trim();
    return fromCache || '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

/** Value shown in the optional paste-URL input (blank when value is a media id). */
export function appearanceMediaUrlInputValue(value: unknown): string {
  if (isAppearanceMediaId(value)) {
    return '';
  }
  return typeof value === 'string' ? value : '';
}
