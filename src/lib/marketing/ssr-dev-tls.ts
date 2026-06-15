/**
 * Dev SSR: Node fetch rejects self-signed HTTPS on local vhosts (WAMP).
 * Vite's /api proxy sets secure:false; SSR calls VITE_API_PROXY_TARGET directly.
 */

import type { Dispatcher } from 'undici';

let devInsecureDispatcher: Dispatcher | undefined;
let devInsecureDispatcherPromise: Promise<Dispatcher> | undefined;

function envHostname(key: string): string | null {
  const raw = String(import.meta.env?.[key] ?? '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return null;
  }
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

function isDevTrustedApiHostname(hostname: string): boolean {
  const hosts = new Set<string>();
  for (const key of ['VITE_API_PROXY_TARGET', 'VITE_SSR_API_BASE_URL', 'VITE_MARKETING_API_URL'] as const) {
    const h = envHostname(key);
    if (h) {
      hosts.add(h);
    }
  }
  return hosts.has(hostname);
}

async function getDevInsecureDispatcher(): Promise<Dispatcher> {
  if (devInsecureDispatcher) {
    return devInsecureDispatcher;
  }
  if (!devInsecureDispatcherPromise) {
    devInsecureDispatcherPromise = import('undici').then(({ Agent }) => {
      devInsecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
      return devInsecureDispatcher;
    });
  }
  return devInsecureDispatcherPromise;
}

/** Dev SSR only: relax TLS for HTTPS calls to configured local API hostnames. */
export async function devSsrFetchTlsInit(url: string): Promise<{ dispatcher?: Dispatcher }> {
  if (!import.meta.env.DEV || typeof window !== 'undefined') {
    return {};
  }
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:') {
      return {};
    }
    if (!isDevTrustedApiHostname(target.hostname)) {
      return {};
    }
    return { dispatcher: await getDevInsecureDispatcher() };
  } catch {
    return {};
  }
}
