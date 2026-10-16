import { getConfig } from '~/lib/config';

/** Addon import: `@itqandev/host/config`. Base URL of the Laravel API (e.g. `/api` in the browser). */
export function apiBaseUrl(): string {
  return getConfig().api.baseUrl.replace(/\/+$/, '');
}
