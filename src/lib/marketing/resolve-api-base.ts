/**
 * Resolve Laravel API root for marketingFetch and SSR loaders.
 *
 * Dev pattern (recommended):
 * - VITE_API_BASE_URL=/api  (browser + SSR via Vite proxy)
 * - VITE_API_PROXY_TARGET=http://your-vhost/credocode/backend/public  (vite.config proxy)
 *
 * Optional: VITE_SSR_API_BASE_URL when Node must call Laravel directly (no Vite proxy).
 */

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function envString(key: string): string {
  const v = import.meta.env?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

function devServerOrigin(): string {
  return envString('VITE_DEV_SERVER_ORIGIN') || 'http://127.0.0.1:5173';
}

/** Qwik may pass a path-only `request.url` during SSR; resolve against the dev server origin. */
function parseForwardDocumentUrl(forwardDocumentUrl: string): URL | null {
  const raw = forwardDocumentUrl.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(raw, `${devServerOrigin()}/`);
    } catch {
      return null;
    }
  }
}

function isLoopbackHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  } catch {
    return false;
  }
}

/** True when origin is the Vite/Qwik dev server (SSR must not fetch it — same-process deadlock). */
function isViteDevServerOrigin(origin: string): boolean {
  try {
    const page = new URL(origin);
    const dev = new URL(devServerOrigin());
    const loopback = (h: string) => h === '127.0.0.1' || h === 'localhost';
    if (!loopback(page.hostname) || !loopback(dev.hostname)) {
      return false;
    }
    return page.port === dev.port;
  } catch {
    return false;
  }
}

/** Node SSR cannot fetch relative URLs; resolve /api to Laravel or the Vite dev proxy. */
function resolveSsrAbsoluteApiBase(normalizedPath: string): string {
  if (import.meta.env.DEV) {
    const ssrOverride = envString('VITE_SSR_API_BASE_URL');
    if (ssrOverride) {
      return trimSlash(ssrOverride);
    }
    // Same path as the browser: Vite dev server proxies /api → WAMP (loopback/vhost direct fetch often times out).
    return trimSlash(`${trimSlash(devServerOrigin())}${normalizedPath}`);
  }
  const proxyTarget = envString('VITE_API_PROXY_TARGET');
  if (proxyTarget) {
    return trimSlash(`${trimSlash(proxyTarget)}${normalizedPath}`);
  }
  return trimSlash(`http://127.0.0.1:5173${normalizedPath}`);
}

/**
 * @param forwardDocumentUrl - Incoming document URL from routeLoader$ (SSR) or browser
 */
export function resolveMarketingApiBaseUrl(forwardDocumentUrl?: string | null): string {
  const ssrOverride = envString('VITE_SSR_API_BASE_URL');
  const marketingUrl = envString('VITE_MARKETING_API_URL');
  const apiUrl = envString('VITE_API_BASE_URL');
  const explicit = marketingUrl || apiUrl;

  const isSsr = typeof window === 'undefined';

  if (isSsr && ssrOverride) {
    return trimSlash(ssrOverride);
  }

  // Absolute URL (http://host/.../api)
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return trimSlash(explicit);
  }

  // Relative /api — same origin as the page (browser) or Vite dev server (SSR → proxy)
  const apiPath = explicit.startsWith('/') ? explicit : '/api';
  const normalizedPath = apiPath.startsWith('/api') ? apiPath : `/api${apiPath}`;

  if (!isSsr && typeof window !== 'undefined') {
    return trimSlash(`${window.location.origin}${normalizedPath}`);
  }

  if (forwardDocumentUrl) {
    const doc = parseForwardDocumentUrl(forwardDocumentUrl);
    if (doc) {
      const skipViteOrigin = isSsr && isViteDevServerOrigin(doc.origin);
      if (!skipViteOrigin) {
        return trimSlash(`${doc.origin}${normalizedPath}`);
      }
    }
  }

  if (isSsr) {
    return resolveSsrAbsoluteApiBase(normalizedPath);
  }

  return trimSlash(normalizedPath);
}

/**
 * API base for getApiClient / LaravelAuthAdapter (config), including SSR without request URL.
 */
export function resolveApiBaseUrlForConfig(): string {
  const ssrOverride = envString('VITE_SSR_API_BASE_URL');
  if (typeof window === 'undefined' && ssrOverride) {
    return trimSlash(ssrOverride);
  }

  const explicit = envString('VITE_MARKETING_API_URL') || envString('VITE_API_BASE_URL') || '/api';

  if (explicit && /^https?:\/\//i.test(explicit)) {
    return trimSlash(explicit);
  }

  if (typeof window !== 'undefined') {
    const path = explicit.startsWith('/') ? explicit : '/api';
    return trimSlash(`${window.location.origin}${path}`);
  }

  const apiPath = explicit.startsWith('/') ? explicit : '/api';
  const normalizedPath = apiPath.startsWith('/api') ? apiPath : `/api${apiPath}`;

  return resolveSsrAbsoluteApiBase(normalizedPath);
}
