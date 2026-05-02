import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { routesFromPreferredCookie } from '../../../../lib/constants/routes';

/**
 * Redirect /admin/settings to the first settings sub-page.
 */
export const useSettingsIndexRedirect = routeLoader$(({ redirect, cookie }) => {
  const R = routesFromPreferredCookie(cookie);
  throw redirect(302, R.ADMIN.SETTINGS_GENERAL);
});

export default component$(() => {
  useSettingsIndexRedirect();
  return null;
});
