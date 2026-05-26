/**
 * Serialize SSR HTTP calls to WAMP/Apache (often single PHP worker in local dev).
 * Uses globalThis so all Vite SSR chunks share one queue (module-level `let` does not).
 */

const QUEUE_KEY = '__credocode_ssr_fetch_queue__';
const INFLIGHT_KEY = '__credocode_ssr_inflight__';

type GlobalWithSsrFetch = typeof globalThis & {
  [QUEUE_KEY]?: Promise<unknown>;
  [INFLIGHT_KEY]?: Map<string, Promise<Response>>;
};

function getQueue(): Promise<unknown> {
  const g = globalThis as GlobalWithSsrFetch;
  if (!g[QUEUE_KEY]) {
    g[QUEUE_KEY] = Promise.resolve();
  }
  return g[QUEUE_KEY]!;
}

function setQueue(next: Promise<unknown>): void {
  (globalThis as GlobalWithSsrFetch)[QUEUE_KEY] = next;
}

function getInflight(): Map<string, Promise<Response>> {
  const g = globalThis as GlobalWithSsrFetch;
  if (!g[INFLIGHT_KEY]) {
    g[INFLIGHT_KEY] = new Map();
  }
  return g[INFLIGHT_KEY]!;
}

function requestKey(input: RequestInfo | URL, init?: RequestInit): string {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return `${(init?.method ?? 'GET').toUpperCase()} ${url}`;
}

function ssrFetchTimeoutMs(): number {
  const envMs = Number(import.meta.env?.VITE_API_TIMEOUT ?? 0);
  if (import.meta.env.DEV) {
    const devDefault = 8000;
    return Number.isFinite(envMs) && envMs > 0 ? Math.min(envMs, 15000) : devDefault;
  }
  const n = envMs || 30000;
  return Number.isFinite(n) && n > 0 ? n : 30000;
}

/** When SSR hits loopback Apache (port 80), set Host so WAMP routes to the named vhost. Skip for Vite dev server. */
function withSsrProxyHostHeader(input: RequestInfo | URL, init?: RequestInit): RequestInit {
  const vhost = String(import.meta.env?.VITE_API_PROXY_HOST ?? '').trim();
  const proxyTarget = String(import.meta.env?.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1').trim();
  const devOrigin = String(import.meta.env?.VITE_DEV_SERVER_ORIGIN ?? 'http://127.0.0.1:5173').trim();
  if (!vhost) {
    return init ?? {};
  }
  try {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const reqUrl = new URL(urlStr);
    const devUrl = new URL(devOrigin);
    // Requests routed through Vite (/api proxy) must not override Host.
    if (reqUrl.port === devUrl.port || reqUrl.origin === devUrl.origin) {
      return init ?? {};
    }
    const targetUrl = new URL(proxyTarget);
    const isLoopback = (h: string) => h === '127.0.0.1' || h === 'localhost';
    if (isLoopback(reqUrl.hostname) && isLoopback(targetUrl.hostname)) {
      const headers = new Headers(init?.headers as HeadersInit);
      if (!headers.has('Host')) {
        headers.set('Host', vhost);
      }
      return { ...init, headers };
    }
  } catch {
    /* ignore */
  }
  return init ?? {};
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutMs = ssrFetchTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const initWithHost = withSsrProxyHostHeader(input, init);
  try {
    return await fetch(input, { ...initWithHost, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`SSR API request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function ssrFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      const timeoutMs = ssrFetchTimeoutMs();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const userSignal = init?.signal;
      if (userSignal?.aborted) {
        controller.abort();
      } else {
        userSignal?.addEventListener('abort', () => controller.abort(), { once: true });
      }
      return fetch(input, { ...init, signal: controller.signal })
        .catch((e) => {
          if (e instanceof Error && e.name === 'AbortError') {
            throw new Error(`API request timed out after ${timeoutMs}ms`);
          }
          throw e;
        })
        .finally(() => clearTimeout(timeoutId));
    }
    return fetch(input, init);
  }

  const key = requestKey(input, init);
  const inflight = getInflight();
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const run = () => fetchWithTimeout(input, init);
  const prev = getQueue();
  const queued = prev.then(run, run);
  setQueue(
    queued.then(
      () => undefined,
      () => undefined,
    ),
  );

  const result = queued.finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, result);
  return result;
}
