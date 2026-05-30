import type { User } from './types';

/** Spatie roles that use the operator dashboard (not the default `user` role). */
const DASHBOARD_STAFF_ROLES = new Set([
  'super_admin',
  'admin',
  'company',
  'editor',
  'viewer',
]);

/**
 * Whether the user dropdown should link to the dashboard home instead of profile settings.
 */
export function userHasDashboardMenu(user: Pick<User, 'role' | 'permissions'>): boolean {
  if (DASHBOARD_STAFF_ROLES.has(user.role)) {
    return true;
  }
  return (user.permissions?.length ?? 0) > 0;
}
