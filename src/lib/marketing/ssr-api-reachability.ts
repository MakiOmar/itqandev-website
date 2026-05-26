/**
 * WAMP + Node SSR: Apache is often unreachable from Node (IPv6/timeouts) while the
 * browser reaches Laravel via Vite proxy (/api). In dev, skip SSR marketing calls and
 * hydrate from the client (see dev-client-marketing.ts).
 */

/** Auth/session endpoints must run during SSR (e.g. routeAction$ login), even when marketing SSR is skipped. */
const SSR_ALWAYS_ALLOW_PREFIXES = ['/auth/', '/me'];

export function shouldSkipSsrMarketingApi(endpoint?: string): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  if (endpoint) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (SSR_ALWAYS_ALLOW_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return false;
    }
  }
  const flag = String(import.meta.env?.VITE_DEV_SSR_SKIP_MARKETING_API ?? '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') {
    return false;
  }
  if (flag === 'true' || flag === '1') {
    return true;
  }
  return !!import.meta.env.DEV;
}
