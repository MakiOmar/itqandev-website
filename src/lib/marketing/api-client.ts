/**
 * Marketing API client for public, unauthenticated requests.
 * Uses VITE_API_BASE_URL or VITE_MARKETING_API_URL (dev/stage/prod).
 */

function getBaseUrl(): string {
  return (import.meta.env?.VITE_MARKETING_API_URL ?? import.meta.env?.VITE_API_BASE_URL ?? '') as string;
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
  options: RequestInit = {}
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
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
 */
export function marketingGet<T>(path: string): Promise<T> {
  return marketingFetch<T>(path, { method: 'GET' });
}

/**
 * POST request (e.g. contact form).
 */
export function marketingPost<T>(path: string, body: unknown): Promise<T> {
  return marketingFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
