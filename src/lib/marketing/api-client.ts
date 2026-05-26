/**
 * Marketing API client for public endpoints (mostly unauthenticated).
 * Sends credentials and optional Bearer when editors preview draft content via the marketing site.
 * Uses VITE_API_BASE_URL or VITE_MARKETING_API_URL (dev/stage/prod).
 */

import { getConfig } from '~/lib/config';
import { resolveMarketingApiBaseUrl } from './resolve-api-base';
import { ensureSsrIpv4First } from './ssr-dns';
import { shouldSkipSsrMarketingApi } from './ssr-api-reachability';
import { ssrFetch } from './ssr-fetch';

export function getMarketingApiBaseUrl(forwardDocumentUrl?: string | null): string {
  return resolveMarketingApiBaseUrl(forwardDocumentUrl);
}

function getBaseUrl(forwardDocumentUrl?: string | null): string {
  return getMarketingApiBaseUrl(forwardDocumentUrl);
}

/** Parsed API root URL (`VITE_MARKETING_API_URL` / `VITE_API_BASE_URL`). */
function tryParseMarketingApiRoot(): URL | null {
  const raw = getMarketingApiBaseUrl().trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

/**
 * Sanctum matches Referer/Origin against SANCTUM_STATEFUL_DOMAINS.
 * - Prefer **VITE_SITE_URL** when set (apex vs `www` when you list only one hostname).
 * - When the HTML host equals the configured API hostname, use **`doc.origin`** so Vite (**`:5173`**) stays
 *   aligned with Laravel’s default port — **SANCTUM_STATEFUL_DOMAINS** must include that port (see docs).
 */
function sanctumSsrOriginAndReferer(forwardDocumentUrl: string): { origin: string; referer: string } | null {
  try {
    const doc = new URL(forwardDocumentUrl);
    const pathPart = `${doc.pathname}${doc.search}`;
    const envSiteRaw = String(import.meta.env?.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');
    if (envSiteRaw) {
      const site = new URL(envSiteRaw.startsWith('http') ? envSiteRaw : `https://${envSiteRaw}`);
      return { origin: site.origin, referer: `${site.origin}${pathPart}` };
    }
    const api = tryParseMarketingApiRoot();
    if (api && doc.hostname === api.hostname) {
      return {
        origin: doc.origin,
        referer: `${doc.origin}${pathPart}`,
      };
    }
    return { origin: doc.origin, referer: `${doc.origin}${pathPart}` };
  } catch {
    return null;
  }
}

/**
 * True when `VITE_MARKETING_API_URL` / `VITE_API_BASE_URL` points at a different browser origin than
 * `documentUrl` (incoming `request.url` during SSR or `window.location` on the client).
 *
 * Laravel session cookies are **host + scheme scoped** — port is not stored in cookie domain, so e.g.
 * `http://itqandev.com:5173` and `http://itqandev.com` share cookies as long as the **hostname matches**
 * the API hostname. SSR can forward cookies in that case; only unrelated hosts (localhost vs vhost alias,
 * apex vs stray hostname) require a browser retry (`/work/[slug]` deferred loader).
 *
 * Requests where **scheme** or **hostname** differ remain cross-origin for this check.
 */
export function marketingApiPageOriginMismatch(documentUrl: string): boolean {
  const api = tryParseMarketingApiRoot();
  if (!api) {
    return false;
  }
  try {
    const page = new URL(documentUrl);
    return page.protocol !== api.protocol || page.hostname !== api.hostname;
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

function marketingFetchTimeoutMs(): number {
  const envMs = Number(import.meta.env?.VITE_API_TIMEOUT ?? 0);
  if (import.meta.env.DEV) {
    const devDefault = 8000;
    return Number.isFinite(envMs) && envMs > 0 ? Math.min(envMs, 15000) : devDefault;
  }
  const n = envMs || 30000;
  return Number.isFinite(n) && n > 0 ? n : 30000;
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
  const base = getBaseUrl(forwardDocumentUrl).replace(/\/$/, '');
  let url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `[marketing] API base must be absolute during SSR (got "${base}"). Set VITE_API_PROXY_TARGET or VITE_SSR_API_BASE_URL.`,
    );
  }
  const authHeaderName = String(import.meta.env?.VITE_AUTH_TOKEN_HEADER ?? 'Authorization');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string>),
    ...optionalBrowserBearerHeaders(),
  };

  if (locale && String(locale).trim() !== '') {
    headers['X-Content-Locale'] = String(locale).trim().toLowerCase();
  }

  if (typeof window === 'undefined') {
    if (shouldSkipSsrMarketingApi()) {
      throw new Error('DEV_SSR_SKIP_MARKETING_API');
    }
    await ensureSsrIpv4First();
    const c = forwardCookies?.trim();
    if (c) {
      headers['Cookie'] = c;
      const docRaw = forwardDocumentUrl?.trim();
      if (docRaw) {
        const pair = sanctumSsrOriginAndReferer(docRaw);
        if (pair) {
          headers['Origin'] = pair.origin;
          headers['Referer'] = pair.referer;
        }
      }
    }
    const a = forwardAuthorization?.trim();
    if (a) {
      headers[authHeaderName] = a;
    }
  }

  const credentials: RequestCredentials = typeof window !== 'undefined' ? 'include' : 'omit';

  const timeoutMs = marketingFetchTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const userSignal = fetchInit.signal;
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let res: Response;
  try {
    res = await ssrFetch(url, {
      ...fetchInit,
      headers,
      credentials,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Marketing API request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

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
