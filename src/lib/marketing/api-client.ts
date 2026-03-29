/**
 * Marketing API client for public, unauthenticated requests.
 * Uses VITE_API_BASE_URL or VITE_MARKETING_API_URL (dev/stage/prod).
 */

export function getMarketingApiBaseUrl(): string {
  return (import.meta.env?.VITE_MARKETING_API_URL ?? import.meta.env?.VITE_API_BASE_URL ?? '') as string;
}

function getBaseUrl(): string {
  return getMarketingApiBaseUrl();
}

export interface MarketingApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Fetch wrapper for marketing public API.
 * Does not send auth headers.
 */
export async function marketingFetch<T>(
  path: string,
  options: RequestInit & { locale?: string | null } = {}
): Promise<T> {
  const { locale, ...fetchInit } = options;
  const base = getBaseUrl().replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string>),
  };
  if (locale && String(locale).trim() !== '') {
    headers['X-Content-Locale'] = String(locale).trim().toLowerCase();
  }

  const res = await fetch(url, {
    ...fetchInit,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!res.ok) {
    const text = isJson ? (await res.json()).message : await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  if (!isJson) return undefined as T;

  const json = await res.json();
  if (json?.data !== undefined) return json.data as T;
  return json as T;
}

/**
 * GET request for marketing API.
 * @param locale - optional UI language for translated CMS fields (sends X-Content-Locale)
 */
export function marketingGet<T>(path: string, locale?: string | null): Promise<T> {
  return marketingFetch<T>(path, { method: 'GET', locale: locale ?? undefined });
}

/**
 * POST request (e.g. contact form).
 */
export function marketingPost<T>(path: string, body: unknown, locale?: string | null): Promise<T> {
  return marketingFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    locale: locale ?? undefined,
  });
}
