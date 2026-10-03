import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export type RunCacheClearResult = { ok: true } | { ok: false; message: string };

type CachePostClient = { post: (url: string, body?: unknown) => Promise<unknown> };

/** Browser cache flush (`POST /v1/cache/clear`); the server re-checks `manageSystemCache`. */
export async function runCacheClearFromBrowser(): Promise<RunCacheClearResult> {
  try {
    await (getApiClient(null) as unknown as CachePostClient).post(API_ENDPOINTS.CACHE.CLEAR, {});
    return { ok: true };
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.warn('[cache-actions] cache clear failed', err);
    const message = err instanceof Error && err.message ? err.message : '';
    return { ok: false, message };
  }
}
