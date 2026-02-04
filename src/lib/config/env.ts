import type { DashboardConfig } from './types';

/**
 * Environment variable loader
 * Loads configuration from environment variables
 */

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue?: string): string | undefined {
  if (typeof window !== 'undefined') {
    // Client-side: use import.meta.env
    return import.meta.env[key] || defaultValue;
  }
  // Server-side: use process.env
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 */
function getEnvBool(key: string, defaultValue = false): boolean {
  const value = getEnv(key);
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Load configuration from environment variables
 */
export function loadEnvConfig(): Partial<DashboardConfig> {
  return {
    api: {
      baseUrl: getEnv('VITE_API_BASE_URL', '/api') || '/api',
      sanctum: getEnvBool('VITE_LARAVEL_SANCTUM', false),
      csrfToken: getEnv('VITE_CSRF_TOKEN'),
      timeout: Number(getEnv('VITE_API_TIMEOUT', '30000')) || 30000,
    },
    routes: {
      admin: {
        prefix: getEnv('VITE_DASHBOARD_PREFIX', '/admin') || '/admin',
        login: getEnv('VITE_ADMIN_LOGIN', '/admin/login') || '/admin/login',
        home: getEnv('VITE_ADMIN_HOME', '/admin') || '/admin',
      },
      public: {
        prefix: getEnv('VITE_PUBLIC_PREFIX', '') || '',
        login: getEnv('VITE_PUBLIC_LOGIN', '/login') || '/login',
        home: getEnv('VITE_PUBLIC_HOME', '/') || '/',
      },
    },
    auth: {
      provider: (getEnv('VITE_AUTH_PROVIDER', 'mock') as 'laravel' | 'mock' | 'custom') || 'mock',
      cookieName: getEnv('VITE_AUTH_COOKIE_NAME', 'auth_session') || 'auth_session',
      tokenHeader: getEnv('VITE_AUTH_TOKEN_HEADER', 'Authorization') || 'Authorization',
      refreshToken: getEnvBool('VITE_AUTH_REFRESH_TOKEN', false),
      sessionStorage: (getEnv('VITE_AUTH_STORAGE', 'cookie') as 'cookie' | 'localStorage' | 'sessionStorage') || 'cookie',
    },
    branding: {
      // NOTE: These env vars are Qwik-side fallback defaults only.
      // Project-specific branding should come from Laravel API.
      // See: src/lib/api/project-settings.ts
      name: getEnv('VITE_APP_NAME', 'Dashboard') || 'Dashboard',
      logo: getEnv('VITE_APP_LOGO'),
      favicon: getEnv('VITE_APP_FAVICON'),
      primaryColor: getEnv('VITE_PRIMARY_COLOR'),
      secondaryColor: getEnv('VITE_SECONDARY_COLOR'),
    },
    features: {
      i18n: getEnvBool('VITE_FEATURE_I18N', false),
      darkMode: getEnvBool('VITE_FEATURE_DARK_MODE', true),
      notifications: getEnvBool('VITE_FEATURE_NOTIFICATIONS', true),
      activityLogs: getEnvBool('VITE_FEATURE_ACTIVITY_LOGS', true),
      systemHealth: getEnvBool('VITE_FEATURE_SYSTEM_HEALTH', true),
    },
  };
}
