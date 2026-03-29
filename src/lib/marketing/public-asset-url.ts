/**
 * Prefix paths with Vite `import.meta.env.BASE_URL` (subfolder deploys / WAMP).
 */
export function publicMarketingAssetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL as string) || '/';
  const rel = path.startsWith('/') ? path.slice(1) : path;
  return base.endsWith('/') ? `${base}${rel}` : `${base}/${rel}`;
}
