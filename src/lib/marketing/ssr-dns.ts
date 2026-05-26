/** Prefer IPv4 for SSR fetches to WAMP vhosts (itqandev.com has AAAA ::1 which hangs on Node). */
let configured = false;
let configurePromise: Promise<void> | null = null;

if (typeof window === 'undefined') {
  configurePromise = import('node:dns')
    .then((dns) => {
      dns.setDefaultResultOrder('ipv4first');
      configured = true;
    })
    .catch(() => {
      configured = true;
    });
}

export function ensureSsrIpv4First(): Promise<void> {
  if (typeof window !== 'undefined' || configured) {
    return Promise.resolve();
  }
  return configurePromise ?? Promise.resolve();
}
