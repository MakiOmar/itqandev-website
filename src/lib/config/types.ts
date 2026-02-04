import type { Role } from '../constants/roles';

/**
 * Route configuration
 */
export interface RouteConfig {
  prefix: string;
  login: string;
  home: string;
  [key: string]: string;
}

/**
 * API configuration
 */
export interface ApiConfig {
  baseUrl: string;
  csrfToken?: string;
  sanctum?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  provider: 'laravel' | 'mock' | 'custom';
  cookieName: string;
  tokenHeader: string;
  refreshToken?: boolean;
  sessionStorage?: 'cookie' | 'localStorage' | 'sessionStorage';
}

/**
 * Branding configuration
 * NOTE: These are Qwik-side fallback defaults only.
 * Project-specific branding (logo, name, etc.) should come from Laravel API via project settings.
 * See: src/lib/api/project-settings.ts
 */
export interface BrandingConfig {
  name: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Features configuration
 */
export interface FeaturesConfig {
  i18n: boolean;
  darkMode: boolean;
  notifications: boolean;
  activityLogs: boolean;
  systemHealth: boolean;
}

/**
 * Main dashboard configuration
 */
export interface DashboardConfig {
  api: ApiConfig;
  routes: {
    admin: RouteConfig;
    public: RouteConfig;
  };
  auth: AuthConfig;
  branding: BrandingConfig;
  features: FeaturesConfig;
  roles?: Role[];
}

/**
 * Configuration override type
 */
export type ConfigOverride = Partial<DashboardConfig>;
