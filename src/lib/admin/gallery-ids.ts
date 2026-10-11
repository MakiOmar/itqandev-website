/**
 * Parse the hidden JSON input of `MediaGalleryField` into positive, unique media ids (in order).
 * Returns undefined when the field was not submitted, so updates leave the stored gallery untouched.
 */
export function parseGalleryIdsJson(raw: unknown): number[] | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  const ids = parsed.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}
