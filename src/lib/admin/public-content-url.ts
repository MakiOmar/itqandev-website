/**
 * Builds paths to public-facing single-resource pages used in admin previews.
 */

export type AdminPublicDetailKind = 'blog' | 'services' | 'projects';

/** URL-encode slug segment safely (hyphenated latin slugs pass through cleanly). */
function slugSegment(slug: string): string | null {
  const t = String(slug ?? '').trim();
  if (!t) {
    return null;
  }
  return encodeURIComponent(t);
}

/**
 * Site-relative path: /{lang}/blog/{slug}, /{lang}/services/{slug}, /{lang}/work/{slug} (projects).
 */
export function adminPublicDetailPath(lang: string, kind: AdminPublicDetailKind, slug: string): string | null {
  const code = String(lang ?? '').trim() || 'en';
  const seg = slugSegment(slug);
  if (!seg) {
    return null;
  }
  const langSeg = encodeURIComponent(code);
  switch (kind) {
    case 'blog':
      return `/${langSeg}/blog/${seg}`;
    case 'services':
      return `/${langSeg}/services/${seg}`;
    case 'projects':
      return `/${langSeg}/work/${seg}`;
    default:
      return null;
  }
}

/**
 * Full URL when VITE_SITE_URL is set, otherwise `${origin}${path}` in the browser,
 * otherwise the path alone (still works for same-origin admin).
 */
export function adminPublicAbsoluteUrl(path: string): string {
  const envBase = String(import.meta.env?.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');
  if (envBase) {
    return `${envBase}${path}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
