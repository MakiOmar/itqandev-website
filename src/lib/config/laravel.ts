import type { DashboardConfig } from './types';

/**
 * Laravel-specific default configuration
 * These defaults are optimized for Laravel Sanctum integration
 */
export const laravelDefaults: Partial<DashboardConfig> = {
  api: {
    baseUrl: '/api',
    sanctum: true,
    csrfToken: undefined, // Will be fetched from Laravel
    timeout: 30000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
  auth: {
    provider: 'laravel',
    cookieName: 'laravel_session',
    tokenHeader: 'Authorization',
    refreshToken: false, // Sanctum uses cookie-based auth
    sessionStorage: 'cookie',
  },
  routes: {
    admin: {
      prefix: '/admin',
      login: '/admin/login',
      home: '/admin',
    },
    public: {
      prefix: '',
      login: '/login',
      home: '/',
    },
  },
};
