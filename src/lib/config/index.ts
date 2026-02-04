import type { DashboardConfig, ConfigOverride } from './types';
import { loadEnvConfig } from './env';
import { laravelDefaults } from './laravel';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';

/**
 * Default configuration
 */
const defaultConfig: DashboardConfig = {
  api: {
    baseUrl: '/api',
    sanctum: false,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  },
  routes: {
    admin: {
      prefix: '/admin',
      login: '/admin/login',
      home: '/admin',
      profile: '/admin/profile',
      users: '/admin/users',
      settings: '/admin/settings',
      activity: '/admin/activity',
      notifications: '/admin/notifications',
      system: '/admin/system',
    },
    public: {
      prefix: '',
      login: '/login',
      home: '/',
    },
  },
  auth: {
    provider: 'mock',
    cookieName: 'auth_session',
    tokenHeader: 'Authorization',
    refreshToken: false,
    sessionStorage: 'cookie',
  },
  branding: {
    // NOTE: These are Qwik-side fallback defaults only.
    // Project-specific branding should come from Laravel API.
    // See: src/lib/api/project-settings.ts
    name: 'Dashboard',
  },
  features: {
    i18n: false,
    darkMode: true,
    notifications: true,
    activityLogs: true,
    systemHealth: true,
  },
  roles: Object.values(ROLES),
};

/**
 * Merge configurations with priority:
 * 1. User override (highest priority)
 * 2. Environment variables
 * 3. Laravel defaults (if provider is laravel)
 * 4. Default config (lowest priority)
 */
function mergeConfig(
  userOverride?: ConfigOverride,
  useLaravelDefaults = false,
): DashboardConfig {
  const baseConfig = useLaravelDefaults
    ? { ...defaultConfig, ...laravelDefaults }
    : defaultConfig;

  const envConfig = loadEnvConfig();

  // Deep merge configurations
  const merged: DashboardConfig = {
    ...baseConfig,
    ...envConfig,
    ...userOverride,
    api: {
      ...baseConfig.api,
      ...envConfig.api,
      ...userOverride?.api,
      headers: {
        ...baseConfig.api.headers,
        ...envConfig.api?.headers,
        ...userOverride?.api?.headers,
      },
    },
    routes: {
      admin: {
        ...baseConfig.routes.admin,
        ...envConfig.routes?.admin,
        ...userOverride?.routes?.admin,
      },
      public: {
        ...baseConfig.routes.public,
        ...envConfig.routes?.public,
        ...userOverride?.routes?.public,
      },
    },
    auth: {
      ...baseConfig.auth,
      ...envConfig.auth,
      ...userOverride?.auth,
    },
    branding: {
      ...baseConfig.branding,
      ...envConfig.branding,
      ...userOverride?.branding,
    },
    features: {
      ...baseConfig.features,
      ...envConfig.features,
      ...userOverride?.features,
    },
  };

  return merged;
}

/**
 * Global configuration instance
 */
let globalConfig: DashboardConfig | null = null;

/**
 * Initialize configuration
 * Call this once at application startup
 */
export function initConfig(
  override?: ConfigOverride,
  useLaravelDefaults = false,
): DashboardConfig {
  globalConfig = mergeConfig(override, useLaravelDefaults);
  return globalConfig;
}

/**
 * Get current configuration
 * Returns default config if not initialized
 */
export function getConfig(): DashboardConfig {
  if (!globalConfig) {
    // Auto-initialize with environment detection
    const envProvider = import.meta.env.VITE_AUTH_PROVIDER || 'mock';
    const useLaravel = envProvider === 'laravel' || import.meta.env.VITE_LARAVEL_SANCTUM === 'true';
    globalConfig = mergeConfig(undefined, useLaravel);
  }
  return globalConfig;
}

/**
 * Update configuration at runtime
 */
export function updateConfig(override: ConfigOverride): DashboardConfig {
  const current = getConfig();
  globalConfig = mergeConfig(override, current.auth.provider === 'laravel');
  return globalConfig;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  globalConfig = null;
}

// Export types
export type {
  DashboardConfig,
  ConfigOverride,
  ApiConfig,
  AuthConfig,
  BrandingConfig,
  FeaturesConfig,
  RouteConfig,
} from './types';
