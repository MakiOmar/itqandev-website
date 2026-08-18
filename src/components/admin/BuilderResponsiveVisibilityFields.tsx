/**
 * Elementor-style Advanced → Responsive visibility controls for builders.
 */
import { component$, useSignal, useTask$, $, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import {
  normalizeHideOn,
  type DeviceHideOn,
} from '~/lib/marketing/device-visibility';
import type { LayoutBreakpoint } from '~/lib/marketing/appearance-types';
import { translateApp } from '~/lib/i18n/useTranslate';

const DEVICES: LayoutBreakpoint[] = ['mobile', 'tablet', 'desktop'];

/** One row so device id is a prop (avoids Qwik map-closure issues). */
const DeviceHideSwitchRow = component$<{
  lang: string;
  device: LayoutBreakpoint;
  checked: boolean;
  onToggle$: QRL<(device: LayoutBreakpoint, checked: boolean) => void | Promise<void>>;
}>((props) => {
  return (
    <div class="flex items-center justify-between gap-2 rounded-md px-1 py-0.5">
      <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
        {translateApp(props.lang, 'builder.advanced.hideOn')}{' '}
        {translateApp(props.lang, `pages.device.${props.device}`)}
      </span>
      <AdminSwitch
        checked={props.checked}
        ariaLabel={`${translateApp(props.lang, 'builder.advanced.hideOn')} ${translateApp(props.lang, `pages.device.${props.device}`)}`}
        onChange$={$((checked) => props.onToggle$(props.device, checked))}
      />
    </div>
  );
});

export const BuilderResponsiveVisibilityFields = component$<{
  lang: string;
  hideOn: DeviceHideOn | null | undefined;
  onChange$: QRL<(next: DeviceHideOn) => void | Promise<void>>;
}>((props) => {
  /** Optimistic UI so switches flip immediately even if parent re-render is slow. */
  const local = useSignal(normalizeHideOn(props.hideOn));

  useTask$(({ track }) => {
    const incoming = track(() => props.hideOn);
    local.value = normalizeHideOn(incoming);
  });

  const onToggle$ = $(async (device: LayoutBreakpoint, checked: boolean) => {
    const next = normalizeHideOn({ ...local.value, [device]: checked });
    local.value = next;
    await props.onChange$(next);
  });

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
        {DEVICES.map((device) => (
          <DeviceHideSwitchRow
            key={device}
            lang={props.lang}
            device={device}
            checked={local.value[device]}
            onToggle$={onToggle$}
          />
        ))}
      </div>
    </div>
  );
});

const InspectorTabBtn = component$<{
  lang: string;
  tab: 'content' | 'style' | 'advanced';
  active: boolean;
  onTab$: QRL<(tab: 'content' | 'style' | 'advanced') => void>;
}>((props) => {
  return (
    <button
      type="button"
      class={[
        'flex-1 rounded-md px-2 py-1.5 text-xs font-medium',
        props.active
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick$={() => props.onTab$(props.tab)}
    >
      {translateApp(props.lang, `builder.tabs.${props.tab}`)}
    </button>
  );
});

export const BuilderInspectorTabs = component$<{
  lang: string;
  tab: 'content' | 'style' | 'advanced';
  showStyle?: boolean;
  onTab$: QRL<(tab: 'content' | 'style' | 'advanced') => void>;
}>((props) => {
  const tabs = props.showStyle
    ? (['content', 'style', 'advanced'] as const)
    : (['content', 'advanced'] as const);
  return (
    <div class="mb-3 inline-flex w-full rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
      {tabs.map((tab) => (
        <InspectorTabBtn
          key={tab}
          lang={props.lang}
          tab={tab}
          active={props.tab === tab}
          onTab$={props.onTab$}
        />
      ))}
    </div>
  );
});
