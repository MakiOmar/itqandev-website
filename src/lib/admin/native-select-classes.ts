/**
 * Shared Tailwind classes for native `<select>` / `<option>` in the Qwik admin.
 *
 * Dark UI (`html.dark`) without `[color-scheme:dark]` often paints Windows/Chromium
 * option popups with invisible labels (dark-on-dark or light-on-light).
 */
export const ADMIN_NATIVE_SELECT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm [color-scheme:light] focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:[color-scheme:dark]';

/** Compact native select (toolbar insert controls, etc.). */
export const ADMIN_NATIVE_SELECT_COMPACT_CLASS =
  'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 [color-scheme:light] dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]';

/** Optional explicit option colors when the OS popup still inherits poorly. */
export const ADMIN_NATIVE_OPTION_CLASS =
  'bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100';
