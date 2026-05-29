/**
 * WAMP + Node SSR: Apache is often unreachable from Node (IPv6/timeouts) while the
 * browser reaches Laravel via Vite proxy (/api). In dev, skip SSR marketing calls and
 * hydrate from the client (see dev-client-marketing.ts).
 */

export function shouldSkipSsrMarketingApi(endpoint?: string): boolean {
  void endpoint;
  return false;
}

/** Dev SSR: WAMP/proxy timeouts are expected; fall back quietly and hydrate in the browser. */
export function isDevSsrMarketingFetchFailure(e: unknown): boolean {
  if (!(e instanceof Error)) {
    return false;
  }
  if (e.message.includes('DEV_SSR_SKIP_MARKETING_API')) {
    return true;
  }
  if (import.meta.env.DEV && typeof window === 'undefined') {
    return (
      e.message.includes('SSR API request timed out') ||
      e.message.includes('Marketing API request timed out')
    );
  }
  return false;
}
