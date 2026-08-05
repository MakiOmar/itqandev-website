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

/** Text inputs matching Blog/Services admin forms. */
export const ADMIN_FORM_INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40';

export const ADMIN_FORM_TEXTAREA_CLASS = `${ADMIN_FORM_INPUT_CLASS} min-h-[5rem]`;

export const ADMIN_FORM_LABEL_CLASS =
  'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200';

/** Card shell used on Blog create/edit (WordPress-like admin panels). */
export const ADMIN_FORM_CARD_CLASS =
  'rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800';

export const ADMIN_FORM_SIDEBAR_CARD_CLASS =
  'rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800';

export const ADMIN_BACK_BUTTON_CLASS =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

export const ADMIN_PRIMARY_BUTTON_CLASS =
  'rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60';

/**
 * Native checkbox — border always visible; filled primary when checked.
 * Pair with ADMIN_CHECKBOX_LABEL_CLASS. Global admin/site CSS also styles bare checkboxes.
 */
export const ADMIN_CHECKBOX_CLASS =
  'h-4 w-4 shrink-0 cursor-pointer rounded border border-slate-400 bg-white text-primary-600 [color-scheme:light] checked:border-primary-600 checked:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-400 dark:bg-slate-800 dark:[color-scheme:dark] dark:checked:border-primary-500 dark:checked:bg-primary-500';

/** Inline label wrapping a checkbox + text. */
export const ADMIN_CHECKBOX_LABEL_CLASS =
  'inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800 select-none dark:text-gray-200';
