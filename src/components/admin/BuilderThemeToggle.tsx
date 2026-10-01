import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { ThemeMode } from '~/lib/theme/theme-scope';

export type BuilderThemeToggleProps = {
  lang: string;
  mode: ThemeMode;
  onChange$: QRL<(mode: ThemeMode) => void>;
};

const MODES: ThemeMode[] = ['light', 'dark'];

/** Builder toolbar switch for the canvas preview theme (independent of the admin's own theme). */
export const BuilderThemeToggle = component$<BuilderThemeToggleProps>((props) => {
  return (
    <div
      class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600"
      role="group"
      aria-label={translateApp(props.lang, 'pages.previewTheme')}
    >
      {MODES.map((mode) => {
        const active = props.mode === mode;
        const label = translateApp(props.lang, `pages.previewTheme_${mode}`);
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active ? 'true' : 'false'}
            aria-label={label}
            title={label}
            class={[
              'inline-flex h-8 w-8 items-center justify-center rounded-md',
              active
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
            ].join(' ')}
            onClick$={async () => {
              await props.onChange$(mode);
            }}
          >
            {mode === 'light' ? (
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
});
