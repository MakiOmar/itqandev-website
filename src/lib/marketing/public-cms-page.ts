import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { withLocaleQuery } from '~/lib/marketing/locale-cache-url';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import { mergeThemeBodyWithContent } from '~/lib/marketing/theme-body-content';
import type { PublicShellState } from '~/lib/marketing/public-shell';
import type { PublicPageDetail } from '~/types/page';

export function parsePublicPageDetail(json: PublicPageDetail & { data?: unknown }): PublicPageDetail | null {
  if (json && typeof json === 'object' && Array.isArray(json.sections) && typeof json.slug === 'string') {
    return json;
  }
  if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
    const inner = json.data as PublicPageDetail;
    if (typeof inner.slug === 'string' && Array.isArray(inner.sections)) {
      return inner;
    }
  }
  return null;
}

export async function fetchPublicCmsPage(
  slug: string,
  uiLocale: string | undefined,
  cookie: string,
  requestUrl: string,
): Promise<PublicPageDetail | null> {
  const trimmed = String(slug ?? '').trim();
  if (!trimmed) {
    return null;
  }
  const base = resolveMarketingApiBaseUrl(requestUrl);
  try {
    const res = await fetch(withLocaleQuery(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(trimmed)}`, uiLocale || 'en'), {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale || 'en',
        Cookie: cookie,
      },
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as PublicPageDetail & { data?: unknown };
    return parsePublicPageDetail(json);
  } catch {
    return null;
  }
}

/**
 * CMS page behind a module index route (portfolio, blog, services) combined with the matched theme body.
 * Archive templates (`themeBodyMode: 'replace'`) render the whole page; page templates wrap its content.
 * Returns null when there is neither a published page nor a theme body (caller responds 404).
 */
export async function resolveIndexCmsPage(opts: {
  slug: string;
  fallbackTitle: string;
  shell: Pick<PublicShellState, 'themeBody' | 'themeBodyMode' | 'branding'>;
  uiLocale: string;
  cookie: string;
  requestUrl: string;
}): Promise<PublicPageDetail | null> {
  const themeBody = opts.shell.themeBody && opts.shell.themeBody.length > 0 ? opts.shell.themeBody : null;
  const page = isFeatureModuleEnabled(opts.shell.branding.features, 'pages')
    ? await fetchPublicCmsPage(opts.slug, opts.uiLocale, opts.cookie, opts.requestUrl)
    : null;

  if (themeBody && (opts.shell.themeBodyMode === 'replace' || !page)) {
    return {
      slug: page?.slug ?? opts.slug,
      title: page?.title || opts.fallbackTitle,
      subtitle: page?.subtitle ?? null,
      excerpt: page?.excerpt ?? '',
      published_at: page?.published_at ?? null,
      exclude_from_search: page?.exclude_from_search ?? false,
      sections: themeBody,
    } as PublicPageDetail;
  }
  if (!page) {
    return null;
  }
  return { ...page, sections: mergeThemeBodyWithContent(themeBody, page.sections) };
}
