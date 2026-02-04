import type { AuthAdapter } from './adapters/base';
import type { RegisterData } from './types';
import { getConfig } from '../config';
import { MockAuthAdapter } from './adapters/mock';
import { LaravelAuthAdapter } from './adapters/laravel';

/**
 * Auth adapter factory
 * Creates the appropriate auth adapter based on configuration
 */
let authAdapterInstance: AuthAdapter | null = null;

/**
 * Get or create auth adapter instance
 */
export function getAuthAdapter(): AuthAdapter {
  if (authAdapterInstance) {
    return authAdapterInstance;
  }

  const config = getConfig();

  switch (config.auth.provider) {
    case 'laravel':
      authAdapterInstance = new LaravelAuthAdapter();
      break;
    case 'mock':
    default:
      authAdapterInstance = new MockAuthAdapter();
      break;
  }

  return authAdapterInstance;
}

/**
 * Reset auth adapter (useful for testing or config changes)
 */
export function resetAuthAdapter(): void {
  authAdapterInstance = null;
}

/**
 * Convenience functions using the adapter
 */
export const auth = {
  login: async (credentials: Parameters<AuthAdapter['login']>[0], cookie?: Parameters<AuthAdapter['login']>[1]) => {
    return getAuthAdapter().login(credentials, cookie);
  },
  logout: async (cookie?: Parameters<AuthAdapter['logout']>[0], request?: Parameters<AuthAdapter['logout']>[1]) => {
    return getAuthAdapter().logout(cookie, request);
  },
  getSession: async (cookie?: Parameters<AuthAdapter['getSession']>[0]) => {
    return getAuthAdapter().getSession(cookie);
  },
  isAuthenticated: async (cookie?: Parameters<AuthAdapter['isAuthenticated']>[0]) => {
    return getAuthAdapter().isAuthenticated(cookie);
  },
  refreshToken: async (cookie?: any) => {
    const adapter = getAuthAdapter();
    if (adapter.refreshToken) {
      return adapter.refreshToken(cookie);
    }
    return null;
  },
  register: async (data: RegisterData, cookie?: any) => {
    const adapter = getAuthAdapter();
    if (adapter.register) {
      return adapter.register(data, cookie);
    }
    return null;
  },
};

// Export adapter types
export type { AuthAdapter } from './adapters/base';
export { MockAuthAdapter } from './adapters/mock';
export { LaravelAuthAdapter } from './adapters/laravel';
