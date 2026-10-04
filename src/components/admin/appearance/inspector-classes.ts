/**
 * Builder inspector layout (Elementor-style): one column of rows, label at the start, control at the end.
 * Kept under components/admin so the admin Tailwind build scans these class strings.
 */

/** Label | control row for short controls (text, number, select, url, switch, colour). */
export const INSPECTOR_ROW = 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-x-3';

/** Row label text. */
export const INSPECTOR_LABEL = 'text-xs font-medium text-gray-600 dark:text-gray-300 text-start';

/** Label above a full-width control (textarea, rich text, repeater, media, icon). */
export const INSPECTOR_STACK_LABEL = `mb-1.5 block ${INSPECTOR_LABEL}`;

/** Text-like input inside a row. */
export const INSPECTOR_INPUT =
  'w-full min-w-0 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-900';

/** Single-column stack of rows. */
export const INSPECTOR_STACK = 'flex flex-col gap-3';

/** Transparency checkerboard behind icon / image previews; translucent so it suits light and dark panels. */
export const INSPECTOR_CHECKER_STYLE = {
  backgroundImage:
    'conic-gradient(rgb(148 163 184 / 0.22) 25%, transparent 0 50%, rgb(148 163 184 / 0.22) 0 75%, transparent 0)',
  backgroundSize: '16px 16px',
};

/** Round icon button laid over a preview (remove). */
export const INSPECTOR_OVERLAY_BTN =
  'absolute end-1.5 top-1.5 rounded-md bg-gray-900/70 p-1.5 text-white shadow hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500';
