import type { JSXOutput } from '@builder.io/qwik';

/**
 * Inline outline icons for builder toolbars. Plain functions (not component$) so they
 * inline into the caller's chunk instead of adding lazy boundaries.
 */
export type BuilderToolbarIconName =
  | 'exit'
  | 'mobile'
  | 'tablet'
  | 'desktop'
  | 'preview'
  | 'navigator'
  | 'undo'
  | 'redo'
  | 'export'
  | 'import'
  | 'save'
  | 'spinner';

const PATHS: Record<Exclude<BuilderToolbarIconName, 'spinner'>, string[]> = {
  exit: [
    'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H21',
  ],
  mobile: [
    'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  ],
  tablet: [
    'M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z',
  ],
  desktop: [
    'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25',
  ],
  preview: [
    'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  ],
  navigator: [
    'M3.75 5.25h7.5M7.5 5.25v12a1.5 1.5 0 0 0 1.5 1.5h2.25M7.5 12h3.75M14.25 12h6M14.25 18.75h6M14.25 5.25h6',
  ],
  undo: ['M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'],
  redo: ['m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3'],
  export: [
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
  ],
  import: [
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
  ],
  save: ['m4.5 12.75 6 6 9-13.5'],
};

export const BUILDER_TOOLBAR_ICON_BTN =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800';

export function builderToolbarToggleClass(active: boolean): string {
  return [
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200'
      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800',
  ].join(' ');
}

/** Icons that point in a reading direction and must mirror in RTL. */
const DIRECTIONAL = new Set<BuilderToolbarIconName>(['exit', 'undo', 'redo']);

export function BuilderToolbarIcon(props: { name: BuilderToolbarIconName; class?: string }): JSXOutput {
  const size = props.class ?? 'h-5 w-5';
  if (props.name === 'spinner') {
    return (
      <svg class={`${size} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" class="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    );
  }
  return (
    <svg
      class={[size, DIRECTIONAL.has(props.name) ? 'rtl:-scale-x-100' : ''].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {PATHS[props.name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
