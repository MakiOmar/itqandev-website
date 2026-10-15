import { MARKETING_ENDPOINTS } from '../marketing/endpoints';
import { marketingGet } from '../marketing/api-client';

const MODULE_KEY = /^[a-z][a-z0-9_]*$/;

/**
 * Whether an addon module is on, read from public site-meta `features` (editors cannot read GET /api/settings).
 * Unknown or unreachable means off.
 */
export async function isAddonModuleOnForRequest(module: string, cookieHeader: string | null): Promise<boolean> {
  if (!MODULE_KEY.test(module)) {
    return false;
  }
  try {
    const meta = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta, null, {
      forwardCookies: cookieHeader,
    });
    const features = meta?.features as Record<string, unknown> | undefined;
    return features?.[module] === true;
  } catch {
    return false;
  }
}

/** `/a/b/` rest param → `['a', 'b']`. */
export function addonPathSegments(rest: string | undefined): string[] {
  return String(rest ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}
