/**
 * Builds paths to public-facing single-resource pages used in admin previews.
 */

import { parsePublicSiteOriginFromEnv } from '~/lib/seo/canonical-url';

export type AdminPublicDetailKind = 'blog' | 'services' | 'projects' | 'pages' | 'forms';

/** URL-encode slug segment safely (hyphenated latin slugs pass through cleanly). */
function slugSegment(slug: string): string | null {
  const t = String(slug ?? '').trim();
  if (!t) {
    return null;
  }
  return encodeURIComponent(t);
}

export type AdminPublicPagePathOptions = {
  parentId?: number | null;
  nestedPath?: string | null;
};

/**
 * Site-relative path: /{lang}/blog/{slug}, /{lang}/services/{slug}, /{lang}/portfolio/{slug}, /{lang}/pages/{slug}/, /{lang}/forms/{slug}/.
 */
export function adminPublicDetailPath(
  lang: string,
  kind: AdminPublicDetailKind,
  slug: string,
  options?: AdminPublicPagePathOptions,
): string | null {
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
      return `/${langSeg}/portfolio/${seg}`;
    case 'pages':
      // Nested children always live under /pages/{parent}/{child}/.
      if (options?.parentId && options.nestedPath) {
        const segs = String(options.nestedPath)
          .split('/')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => encodeURIComponent(part));
        if (segs.length > 0) {
          return `/${langSeg}/pages/${segs.join('/')}/`;
        }
      }
      // Canonical marketing contact URL (hard-coded route prefers this slug).
      if (String(slug ?? '').trim().toLowerCase() === 'contact') {
        return `/${langSeg}/contact/`;
      }
      return `/${langSeg}/pages/${seg}/`;
    case 'forms':
      return `/${langSeg}/forms/${seg}/`;
    default:
      return null;
  }
}

/**
 * Full URL when `VITE_API_PROXY_TARGET` is set, otherwise `${origin}${path}` in the browser,
 * otherwise the path alone (still works for same-origin admin).
 */
export function adminPublicAbsoluteUrl(path: string): string {
  const envOrigin = parsePublicSiteOriginFromEnv();
  if (envOrigin) {
    return `${envOrigin}${path}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
