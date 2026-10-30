/**
 * Module flags from backend config/features.php. No runtime imports: `node --test` loads this file
 * directly (scripts/feature-modules.test.mjs).
 */

/** Backend config/features.php module keys (GET /api/settings `features`). */
export type FeatureModuleKey =
  | 'projects'
  | 'categories'
  | 'skills'
  | 'services'
  | 'testimonials'
  | 'blog'
  | 'pages'
  | 'forms'
  | 'media'
  | 'users'
  | 'seo'
  | 'overlays';

/** Built-in keys the backend omits stay on (older backends predate some keys). */
export const DEFAULT_FEATURE_MODULES: Record<FeatureModuleKey, boolean> = {
  projects: true,
  categories: true,
  skills: true,
  services: true,
  testimonials: true,
  blog: true,
  pages: true,
  forms: true,
  media: true,
  users: true,
  seo: true,
  overlays: true,
};

/** Backend unreachable: hide every module rather than show ones the backend may have disabled. */
export const UNAVAILABLE_FEATURE_MODULES: Record<FeatureModuleKey, boolean> = Object.fromEntries(
  Object.keys(DEFAULT_FEATURE_MODULES).map((key) => [key, false]),
) as Record<FeatureModuleKey, boolean>;

export function isFeatureModuleEnabled(
  features: Record<string, boolean> | undefined,
  key: FeatureModuleKey,
): boolean {
  if (!features || !(key in features)) {
    return true;
  }
  return features[key] !== false;
}

/** Addon modules are off unless the API explicitly reports them on. */
export function isAddonModuleEnabled(features: Record<string, boolean> | undefined, key: string): boolean {
  return features?.[key] === true;
}

export type AdminSettingsSource = 'settings' | 'site-meta' | 'unavailable';

export interface ResolvedAdminSettings {
  source: AdminSettingsSource;
  /** Unwrapped response body; null when the backend could not be read. */
  payload: Record<string, unknown> | null;
  features: Record<string, boolean>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Accepts the API client result (`{ success, data }`) or a raw `{ data }` body. */
function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  for (let depth = 0; depth < 2 && isRecord(value) && !('features' in value) && 'data' in value; depth++) {
    value = value.data;
  }
  return isRecord(value) ? value : null;
}

function readFeatures(payload: Record<string, unknown> | null): Record<string, boolean> | null {
  if (!payload || !isRecord(payload.features)) {
    return null;
  }
  const features: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(payload.features)) {
    if (typeof value === 'boolean') {
      features[key] = value;
    }
  }
  return features;
}

/**
 * Module flags for the dashboard. GET /api/settings needs `manageSettings`, so other roles fall back
 * to the public site-meta flags. A body without `features` (e.g. another server on the API port)
 * counts as unreachable.
 */
export async function resolveAdminSettings(
  fetchSettings: () => Promise<unknown>,
  fetchSiteMeta: () => Promise<unknown>,
): Promise<ResolvedAdminSettings> {
  const sources: Array<[AdminSettingsSource, () => Promise<unknown>]> = [
    ['settings', fetchSettings],
    ['site-meta', fetchSiteMeta],
  ];

  for (const [source, fetcher] of sources) {
    try {
      const payload = unwrapPayload(await fetcher());
      const features = readFeatures(payload);
      if (features) {
        return { source, payload, features: { ...DEFAULT_FEATURE_MODULES, ...features } };
      }
    } catch {
      // Try the next source; the caller decides how to surface an unreachable backend.
    }
  }

  return { source: 'unavailable', payload: null, features: { ...UNAVAILABLE_FEATURE_MODULES } };
}
