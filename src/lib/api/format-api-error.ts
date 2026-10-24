/**
 * One-line message for a failed Laravel API call. For 422 responses the field
 * messages replace Laravel's summary ("… (and 2 more errors)"), which repeats the first one.
 */
export function formatApiError(err: unknown, fallback = 'Request failed'): string {
  const e = err as { message?: string; status?: number; errors?: Record<string, string[] | string> };
  const base = String(e?.message || fallback);
  if (e?.status === 422 && e.errors && typeof e.errors === 'object') {
    const messages = Object.values(e.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((msg) => msg != null && String(msg).trim() !== '')
      .map(String);
    if (messages.length > 0) {
      return [...new Set(messages)].slice(0, 8).join(' ').slice(0, 800);
    }
  }
  return base.slice(0, 600);
}
