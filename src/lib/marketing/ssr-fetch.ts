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

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutMs = ssrFetchTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
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
