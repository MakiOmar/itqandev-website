/**
 * Shared Tailwind tokens for admin custom selects / dropdown panels.
 * Use logical properties (`text-start`, `start-0` / `end-0`) so RTL stays correct.
 */

export const ADMIN_SELECT_TRIGGER_CLS =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-start text-sm text-gray-900 shadow-sm hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-primary-700/40 disabled:cursor-not-allowed disabled:opacity-60';

/** Full-width panel anchored to the trigger (inline-start + inline-end). */
export const ADMIN_SELECT_PANEL_CLS =
  'absolute start-0 end-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-start shadow-lg dark:border-gray-700 dark:bg-gray-900';

export const ADMIN_SELECT_OPTION_CLS =
  'flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800';

export const ADMIN_SELECT_OPTION_ACTIVE_CLS = 'bg-primary-50 dark:bg-primary-950/40';

export const ADMIN_SELECT_BACKDROP_CLS =
  'fixed inset-0 z-40 cursor-default bg-transparent';

export const ADMIN_SELECT_CHEVRON_CLS = 'h-5 w-5 shrink-0 text-gray-500';
