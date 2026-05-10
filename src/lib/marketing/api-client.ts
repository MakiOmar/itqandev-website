/**
 * Marketing API client for public endpoints (mostly unauthenticated).
 * Sends credentials and optional Bearer when editors preview draft content via the marketing site.
 * Uses VITE_API_BASE_URL or VITE_MARKETING_API_URL (dev/stage/prod).
 */

import { getConfig } from '~/lib/config';

export function getMarketingApiBaseUrl(): string {
  return (import.meta.env?.VITE_MARKETING_API_URL ?? import.meta.env?.VITE_API_BASE_URL ?? '') as string;
}

function getBaseUrl(): string {
  return getMarketingApiBaseUrl();
}

/**
 * Sanctum matches Referer/Origin host against SANCTUM_STATEFUL_DOMAINS. A common miss is
 * listing `itqandev.com` but serving the site on `www.itqandev.com` — no match, no session.
 * When VITE_SITE_URL is set to the canonical origin that is included in stateful domains,
 * use it for Origin/Referer while keeping path/query from the real document URL.
 */
function sanctumSsrOriginAndReferer(forwardDocumentUrl: string): { origin: string; referer: string; canon: boolean } | null {
  try {
    const doc = new URL(forwardDocumentUrl);
    const pathPart = `${doc.pathname}${doc.search}`;
    const envSiteRaw = String(import.meta.env?.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');
    if (envSiteRaw) {
      const site = new URL(envSiteRaw.startsWith('http') ? envSiteRaw : `https://${envSiteRaw}`);
      return { origin: site.origin, referer: `${site.origin}${pathPart}`, canon: true };
    }
    return { origin: doc.origin, referer: `${doc.origin}${pathPart}`, canon: false };
  } catch {
    return null;
  }
}

/**
 * True when `VITE_MARKETING_API_URL` / `VITE_API_BASE_URL` points at a different browser origin than
 * `documentUrl` (incoming `request.url` during SSR or `window.location` on the client).
 *
 * Laravel session cookies are keyed by API host — they cannot be forwarded from SSR when the HTML
 * request lands on localhost / another hostname. The browser can still attach them via
 * `credentials: 'include'` on same fetch to that API origin.
 */
export function marketingApiPageOriginMismatch(documentUrl: string): boolean {
  const raw = getMarketingApiBaseUrl().trim();
  if (!raw) {
    return false;
  }
  try {
    const pageOrigin = new URL(documentUrl).origin;
    const apiSeed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const apiOrigin = new URL(apiSeed).origin;
    return apiOrigin !== pageOrigin;
  } catch {
    return false;
  }
}

/** Forward cookies / Authorization on SSR, or rely on browser credentials + localStorage token. */
export type MarketingFetchContext = {
  forwardCookies?: string | null;
  forwardAuthorization?: string | null;
  /**
   * Absolute URL of the incoming document request during SSR (`request.url`).
   * Laravel Sanctum only enables session middleware when Referer OR Origin matches
   * `SANCTUM_STATEFUL_DOMAINS`; SSR `fetch` does not set those implicitly.
   */
  forwardDocumentUrl?: string | null;
};

export interface MarketingApiResponse<T> {
  data: T;
  message?: string;
}

function optionalBrowserBearerHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    // Must match LaravelApiClient + auth adapter (`getConfig().auth.cookieName`; often `laravel_session`, not `auth_session`).
    const storageKey = getConfig().auth.cookieName;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as { token?: string };
    const token = parsed?.token;
    if (token && token !== 'sanctum_cookie') {
      const authHeader = String(import.meta.env?.VITE_AUTH_TOKEN_HEADER ?? 'Authorization');
      return { [authHeader]: `Bearer ${token}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Fetch wrapper for marketing public API.
 * Browser: `credentials: include` (Sanctum session) + optional Bearer from localStorage (matches dashboard client).
 * SSR: pass `forwardCookies` / `forwardAuthorization` from the incoming document request so loaders can preview drafts.
 */
export async function marketingFetch<T>(
  path: string,
  options: RequestInit &
    MarketingFetchContext & { locale?: string | null } = {},
): Promise<T> {
  const { locale, forwardCookies, forwardAuthorization, forwardDocumentUrl, ...fetchInit } = options;
  const base = getBaseUrl().replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const authHeaderName = String(import.meta.env?.VITE_AUTH_TOKEN_HEADER ?? 'Authorization');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string>),
    ...optionalBrowserBearerHeaders(),
  };
  let fwdSanctumSsrHint = false;
  let fwdSanctumCanon = false;

  if (locale && String(locale).trim() !== '') {
    headers['X-Content-Locale'] = String(locale).trim().toLowerCase();
  }

  if (typeof window === 'undefined') {
    const c = forwardCookies?.trim();
    if (c) {
      headers['Cookie'] = c;
      const docRaw = forwardDocumentUrl?.trim();
      if (docRaw) {
        const pair = sanctumSsrOriginAndReferer(docRaw);
        if (pair) {
          headers['Origin'] = pair.origin;
          headers['Referer'] = pair.referer;
          fwdSanctumCanon = pair.canon;
          fwdSanctumSsrHint = !!(headers['Origin'] && headers['Referer']);
        }
      }
    }
    const a = forwardAuthorization?.trim();
    if (a) {
      headers[authHeaderName] = a;
    }
  }

  const credentials: RequestCredentials = typeof window !== 'undefined' ? 'include' : 'omit';

  let urlHost = '';
  try {
    urlHost = new URL(url).host;
  } catch {
    urlHost = 'parse-failed';
  }
  const hasAuthHeaderKey = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');

  let res: Response;
  try {
    res = await fetch(url, {
      ...fetchInit,
      headers,
      credentials,
    });
  } catch (netErr: unknown) {
    // #region agent log
    const netMsg = netErr instanceof Error ? netErr.message : String(netErr);
    fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '597541' },
      body: JSON.stringify({
        sessionId: '597541',
        hypothesisId: 'H1-H4',
        location: 'api-client.ts:marketingFetch:networkCatch',
        message: 'marketing fetch threw before response (possible CORS/network)',
        data: {
          netMsgSnippet: netMsg.slice(0, 160),
          urlHost,
          pathSlice: path.slice(0, 96),
          isBrowser: typeof window !== 'undefined',
          credMode: credentials,
          fwdCookieLen: forwardCookies?.length ?? 0,
          hasFwdAuth: !!(forwardAuthorization && String(forwardAuthorization).trim()),
          hasBearerInHeaders: hasAuthHeaderKey,
          fwdSanctumSsrHint,
          fwdSanctumCanon,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw netErr;
  }

  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  // #region agent log
  fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '597541' },
    body: JSON.stringify({
      sessionId: '597541',
      hypothesisId: 'H1-H2-H4',
      location: 'api-client.ts:marketingFetch:afterResponse',
      message: 'marketing fetch got response',
      data: {
        httpStatus: res.status,
        resOk: res.ok,
        urlHost,
        pathSlice: path.slice(0, 96),
        isBrowser: typeof window !== 'undefined',
        credMode: credentials,
        fwdCookieLen: forwardCookies?.length ?? 0,
        hasFwdAuth: !!(forwardAuthorization && String(forwardAuthorization).trim()),
        hasBearerInHeaders: hasAuthHeaderKey,
        fwdSanctumSsrHint,
        fwdSanctumCanon,
        isJsonGuess: !!isJson,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
export function marketingGet<T>(
  path: string,
  locale?: string | null,
  fetchContext?: MarketingFetchContext,
): Promise<T> {
  return marketingFetch<T>(path, {
    method: 'GET',
    locale: locale ?? undefined,
    ...fetchContext,
  });
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
