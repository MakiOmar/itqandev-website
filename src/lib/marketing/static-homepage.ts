/**
 * WordPress-style static front page (mirrors backend App\Support\StaticHomepage).
 */

export const SHOW_ON_FRONT_BUILDER = 'builder';
export const SHOW_ON_FRONT_PAGE = 'page';

export type ShowOnFront = typeof SHOW_ON_FRONT_BUILDER | typeof SHOW_ON_FRONT_PAGE;

export type PublicFrontPageMeta = {
  show_on_front: ShowOnFront;
  page_on_front: number | null;
  slug: string | null;
};

const PRETTY_PATH_BY_SLUG: Record<string, string> = {
  services: '/services/',
  portfolio: '/portfolio/',
  about: '/about/',
  pricing: '/pricing/',
  articles: '/blog/',
  contact: '/contact/',
};

export function parseShowOnFront(raw: unknown): ShowOnFront {
  return String(raw ?? '').trim().toLowerCase() === SHOW_ON_FRONT_PAGE
    ? SHOW_ON_FRONT_PAGE
    : SHOW_ON_FRONT_BUILDER;
}

export function parsePageOnFrontId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function parsePublicFrontPageMeta(siteMeta: Record<string, unknown> | null | undefined): PublicFrontPageMeta {
  const slugRaw = typeof siteMeta?.front_page_slug === 'string' ? siteMeta.front_page_slug.trim() : '';
  const show = parseShowOnFront(siteMeta?.show_on_front);
  const id = parsePageOnFrontId(siteMeta?.page_on_front);
  const slug = slugRaw !== '' ? slugRaw.toLowerCase() : null;
  if (show !== SHOW_ON_FRONT_PAGE || !slug) {
    return {
      show_on_front: SHOW_ON_FRONT_BUILDER,
      page_on_front: id,
      slug: null,
    };
  }
  return {
    show_on_front: SHOW_ON_FRONT_PAGE,
    page_on_front: id,
    slug,
  };
}

/** Locale-stripped public path for a CMS slug (front page is `/`). */
export function cmsPageLogicalPath(slug: string, isFrontPage: boolean): string {
  const s = String(slug ?? '').trim().toLowerCase();
  if (!s) {
    return '/pages/';
  }
  if (isFrontPage) {
    return '/';
  }
  return PRETTY_PATH_BY_SLUG[s] ?? `/pages/${s}/`;
}

export function pathLooksLikeFrontPageAlias(logicalPath: string, frontSlug: string): boolean {
  const path = (logicalPath.replace(/\/+$/, '') || '/').toLowerCase();
  if (path === '/' || path === '') {
    return false;
  }
  const slug = frontSlug.trim().toLowerCase();
  if (!slug) {
    return false;
  }
  const pretty = (PRETTY_PATH_BY_SLUG[slug] || `/pages/${slug}/`).replace(/\/+$/, '');
  const generic = `/pages/${slug}`;
  return path === pretty || path === generic || path.startsWith(`${generic}/`);
}
