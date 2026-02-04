/**
 * Main entry point for Qwik Dashboard
 * Export all public APIs for projects to use
 */

// Configuration
export {
  initConfig,
  getConfig,
  updateConfig,
  resetConfig,
  type DashboardConfig,
  type ConfigOverride,
} from './lib/config';

// Authentication
export {
  getAuthAdapter,
  resetAuthAdapter,
  auth,
  type AuthAdapter,
  MockAuthAdapter,
  LaravelAuthAdapter,
} from './lib/auth';

// Extensions
export {
  registerExtension,
  registerExtensions,
  getExtensions,
  extensions,
  extensionRegistry,
} from './lib/extensions/registry';

// API Clients
export { apiClient, getApiClient } from './lib/api/client';
export { LaravelApiClient } from './lib/api/laravel-client';

// Types
export * from './types';
