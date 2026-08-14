/**
 * Elementor-style Advanced → Responsive visibility controls for builders.
 */
import { component$, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import {
  normalizeHideOn,
  type DeviceHideOn,
} from '~/lib/marketing/device-visibility';
import type { LayoutBreakpoint } from '~/lib/marketing/appearance-types';
import { translateApp } from '~/lib/i18n/useTranslate';

export const BuilderResponsiveVisibilityFields = component$<{
  lang: string;
  hideOn: DeviceHideOn | null | undefined;
  onChange$: QRL<(next: DeviceHideOn) => void | Promise<void>>;
}>((props) => {
  const current = normalizeHideOn(props.hideOn);
  const devices: LayoutBreakpoint[] = ['mobile', 'tablet', 'desktop'];

  return (
    <div class="space-y-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {translateApp(props.lang, 'builder.advanced.responsive')}
        </p>
        <p class="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
          {translateApp(props.lang, 'builder.advanced.responsiveHint')}
        </p>
      </div>
      <div class="space-y-2 rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
        {devices.map((device) => (
          <div
            key={device}
            class="flex items-center justify-between gap-2 rounded-md px-1 py-0.5"
          >
            <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
              {translateApp(props.lang, 'builder.advanced.hideOn')}{' '}
              {translateApp(props.lang, `pages.device.${device}`)}
            </span>
            <AdminSwitch
              checked={current[device]}
              onChange$={async (checked) => {
                await props.onChange$({
                  ...current,
                  [device]: checked,
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export const BuilderInspectorTabs = component$<{
  lang: string;
  tab: 'content' | 'advanced';
  onTab$: QRL<(tab: 'content' | 'advanced') => void>;
}>((props) => {
  return (
    <div class="mb-3 inline-flex w-full rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
      {(['content', 'advanced'] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          class={[
            'flex-1 rounded-md px-2 py-1.5 text-xs font-medium',
            props.tab === tab
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick$={() => props.onTab$(tab)}
        >
          {translateApp(props.lang, `builder.tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
});
