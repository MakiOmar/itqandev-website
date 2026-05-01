import type { ApiResponse } from './types';
import { API_ENDPOINTS } from './endpoints';
import { getApiClient } from './client';

/** Backend config/features.php module keys (GET /api/settings `features`). */
export type FeatureModuleKey =
  | 'projects'
  | 'categories'
  | 'skills'
  | 'services'
  | 'testimonials'
  | 'blog'
  | 'media'
  | 'users'
  | 'seo';

/** Defaults when API is unavailable; mirrors backend canonical keys (all enabled). */
export const DEFAULT_FEATURE_MODULES: Record<FeatureModuleKey, boolean> = {
  projects: true,
  categories: true,
  skills: true,
  services: true,
  testimonials: true,
  blog: true,
  media: true,
  users: true,
  seo: true,
};

export function isFeatureModuleEnabled(
  features: Record<string, boolean> | undefined,
  key: FeatureModuleKey,
): boolean {
  if (!features || !(key in features)) {
    return true;
  }
  return features[key] !== false;
}

/**
 * Project settings interface
 * These are project-specific settings that come from Laravel
 */
export interface ProjectSettings {
  // Branding
  name: string;
  logo?: string;
  logoDark?: string;
  logoLight?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  
  // General settings
  description?: string;
  supportEmail?: string;
  supportPhone?: string;
  
  /** Module toggles from Laravel config/features.php (not persisted). */
  features?: Partial<Record<FeatureModuleKey, boolean>> & Record<string, boolean>;

  /** Max upload file size in bytes (from server config). Used for client-side validation before submit. */
  max_file_size?: number;

  // Custom project settings
  [key: string]: any;
}

/**
 * Default project settings (fallback)
 * These are used when Laravel API is not available or returns no data
 */
export const defaultProjectSettings: ProjectSettings = {
  name: 'Dashboard',
  description: '',
  features: { ...DEFAULT_FEATURE_MODULES },
};

function normalizeProjectSettings(raw: Record<string, any>): ProjectSettings {
  const maxFileSize = Number(raw?.max_file_size);
  const uploadMaxSize = Number(raw?.upload_max_size);
  const normalizedMaxFileSize =
    maxFileSize > 0
      ? maxFileSize
      : uploadMaxSize > 0
        ? uploadMaxSize <= 10000
          ? uploadMaxSize * 1024 * 1024
          : uploadMaxSize
        : undefined;

  const mergedFeatures: Record<FeatureModuleKey, boolean> = { ...DEFAULT_FEATURE_MODULES };
  const rawFeatures = raw?.features;
  if (rawFeatures && typeof rawFeatures === 'object') {
    for (const key of Object.keys(DEFAULT_FEATURE_MODULES) as FeatureModuleKey[]) {
      const v = rawFeatures[key];
      if (typeof v === 'boolean') {
        mergedFeatures[key] = v;
      }
    }
  }

  return {
    ...raw,
    features: mergedFeatures,
    name: raw?.name || raw?.site_name || defaultProjectSettings.name,
    logo: raw?.logo || raw?.site_logo || undefined,
    logoDark:
      raw?.logoDark ||
      raw?.logo_dark ||
      raw?.dark_logo ||
      raw?.site_logo_dark ||
      undefined,
    logoLight:
      raw?.logoLight ||
      raw?.logo_light ||
      raw?.light_logo ||
      raw?.site_logo_light ||
      undefined,
    favicon: raw?.favicon || raw?.site_favicon || undefined,
    primaryColor: raw?.primaryColor || raw?.primary_color || undefined,
    secondaryColor: raw?.secondaryColor || raw?.secondary_color || undefined,
    description: raw?.description || raw?.site_description || defaultProjectSettings.description,
    supportEmail: raw?.supportEmail || raw?.site_email || undefined,
    supportPhone: raw?.supportPhone || raw?.site_phone || undefined,
    max_file_size: normalizedMaxFileSize,
  };
}

/**
 * Fetch project settings from Laravel API
 * This should be called on app initialization or when settings change
 */
export async function fetchProjectSettings(): Promise<ProjectSettings> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get<ProjectSettings>(API_ENDPOINTS.SETTINGS.GET);
    
    if (response.success && response.data) {
      const normalized = normalizeProjectSettings(response.data as any);
      return {
        ...defaultProjectSettings,
        ...normalized,
      };
    }
    
    return defaultProjectSettings;
  } catch (error: any) {
    // Only log warnings for unexpected errors (not 404/401 which are expected in development)
    const status = error?.status || (error?.response?.status);
    const isExpectedError = status === 404 || status === 401;
    
    if (!isExpectedError || import.meta.env.DEV) {
      // In development, show all errors for debugging
      // In production, only show unexpected errors
      if (!import.meta.env.DEV && !isExpectedError) {
        console.warn('Failed to fetch project settings from Laravel, using defaults:', error);
      }
    }
    
    return defaultProjectSettings;
  }
}

/**
 * Get project settings with caching
 * Caches settings in memory to avoid repeated API calls
 */
let cachedSettings: ProjectSettings | null = null;
let settingsPromise: Promise<ProjectSettings> | null = null;

export async function getProjectSettings(forceRefresh = false): Promise<ProjectSettings> {
  // Return cached settings if available and not forcing refresh
  if (cachedSettings && !forceRefresh) {
    return cachedSettings;
  }
  
  // If a request is already in progress, return that promise
  if (settingsPromise && !forceRefresh) {
    return settingsPromise;
  }
  
  // Fetch new settings
  settingsPromise = fetchProjectSettings();
  cachedSettings = await settingsPromise;
  settingsPromise = null;
  
  return cachedSettings;
}

/**
 * Clear cached settings (useful after settings update)
 */
export function clearProjectSettingsCache(): void {
  cachedSettings = null;
  settingsPromise = null;
}
