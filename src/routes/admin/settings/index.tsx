import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ROUTES } from '../../../lib/constants/routes';

/**
 * Redirect /admin/settings to the first settings sub-page.
 */
export const useSettingsIndexRedirect = routeLoader$(({ redirect }) => {
  throw redirect(302, ROUTES.ADMIN.SETTINGS_GENERAL);
});

export default component$(() => {
  useSettingsIndexRedirect();
  return null;
});
