import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
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
  uiLocale: string,
  cookie: string,
  requestUrl: string,
): Promise<PublicPageDetail | null> {
  const trimmed = String(slug ?? '').trim();
  if (!trimmed) {
    return null;
  }
  const base = resolveMarketingApiBaseUrl(requestUrl);
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(trimmed)}`, {
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
