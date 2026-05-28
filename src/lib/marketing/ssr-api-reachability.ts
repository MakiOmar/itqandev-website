/**
 * WAMP + Node SSR: Apache is often unreachable from Node (IPv6/timeouts) while the
 * browser reaches Laravel via Vite proxy (/api). In dev, skip SSR marketing calls and
 * hydrate from the client (see dev-client-marketing.ts).
 */

export function shouldSkipSsrMarketingApi(endpoint?: string): boolean {
  void endpoint;
  return false;
}
