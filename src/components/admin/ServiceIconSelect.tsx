import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { translateApp } from '../../lib/i18n/useTranslate';
import {
  SERVICE_ICON_SELECT_VALUES,
  isPresetServiceIconKey,
  normalizeServiceIconKeyForSelect,
  presetIconPreviewUrl,
  resolveServiceIconUrl,
  serviceIconSelectBoundValue,
} from '../../lib/marketing/service-icons';
import {
  ADMIN_SELECT_BACKDROP_CLS,
  ADMIN_SELECT_CHEVRON_CLS,
  ADMIN_SELECT_OPTION_ACTIVE_CLS,
  ADMIN_SELECT_OPTION_CLS,
  ADMIN_SELECT_PANEL_CLS,
  ADMIN_SELECT_TRIGGER_CLS,
} from './admin-select-classes';

const ICON_LABEL_KEYS: Record<(typeof SERVICE_ICON_SELECT_VALUES)[number], string> = {
  web: 'services.iconOptWeb',
  android: 'services.iconOptAndroid',
  ios: 'services.iconOptIos',
  'cross-platform': 'services.iconOptCrossPlatform',
  'ui-ux': 'services.iconOptUiUx',
  api: 'services.iconOptApi',
};

function customIconPreviewUrl(raw: string): string {
  return resolveServiceIconUrl({ slug: 'service', icon: raw });
}

/**
 * Preset marketing icons from `/public/icons` (plus empty = default from slug at render time).
 * Custom dropdown so each option can show an image preview (a native select cannot).
 */
export const ServiceIconSelect = component$<{
  id: string;
  /** Current stored icon (keyword, alias, or custom path/URL). */
  value: string;
  lang: string;
  onChange$: QRL<(value: string) => void>;
}>((props) => {
  const raw = (props.value ?? '').trim();
  const showCustomOption = raw !== '' && !isPresetServiceIconKey(raw);
  const bound = serviceIconSelectBoundValue(props.value);
  const listboxId = `${props.id}-listbox`;
  const open = useSignal(false);

  const triggerPreviewSrc = !raw
    ? null
    : isPresetServiceIconKey(raw)
      ? presetIconPreviewUrl(normalizeServiceIconKeyForSelect(raw) as (typeof SERVICE_ICON_SELECT_VALUES)[number])
      : customIconPreviewUrl(raw);

  const triggerLabel = !raw
    ? translateApp(props.lang, 'services.iconNone')
    : isPresetServiceIconKey(raw)
      ? translateApp(
          props.lang,
          ICON_LABEL_KEYS[normalizeServiceIconKeyForSelect(raw) as (typeof SERVICE_ICON_SELECT_VALUES)[number]],
        )
      : `${translateApp(props.lang, 'services.iconCustomCurrent')} (${raw.length > 36 ? `${raw.slice(0, 36)}…` : raw})`;

  return (
    <div class="relative z-50 max-w-md">
      <button
        type="button"
        id={props.id}
        class={ADMIN_SELECT_TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open.value}
        aria-controls={listboxId}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        <span class="flex min-w-0 flex-1 items-center gap-3">
          {triggerPreviewSrc ? (
            <img
              src={triggerPreviewSrc}
              alt=""
              width={32}
              height={32}
              class="h-8 w-8 shrink-0 object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-[10px] font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500"
              aria-hidden="true"
            >
              —
            </span>
          )}
          <span class="min-w-0 truncate">{triggerLabel}</span>
        </span>
        <svg class={ADMIN_SELECT_CHEVRON_CLS} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      {open.value ? (
        <>
          {/* Close when clicking outside the control */}
          <button
            type="button"
            class={ADMIN_SELECT_BACKDROP_CLS}
            aria-hidden="true"
            onClick$={() => {
              open.value = false;
            }}
          />
          <div id={listboxId} role="listbox" class={ADMIN_SELECT_PANEL_CLS}>
            <button
              type="button"
              role="option"
              aria-selected={bound === ''}
              class={[ADMIN_SELECT_OPTION_CLS, bound === '' ? ADMIN_SELECT_OPTION_ACTIVE_CLS : ''].join(' ')}
              onClick$={() => {
                props.onChange$('');
                open.value = false;
              }}
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500">
                —
              </span>
              <span class="text-gray-900 dark:text-gray-100">{translateApp(props.lang, 'services.iconNone')}</span>
            </button>

            {showCustomOption ? (
              <button
                type="button"
                role="option"
                aria-selected={bound === raw}
                class={[ADMIN_SELECT_OPTION_CLS, bound === raw ? ADMIN_SELECT_OPTION_ACTIVE_CLS : ''].join(' ')}
                onClick$={() => {
                  props.onChange$(raw);
                  open.value = false;
                }}
              >
                <img
                  src={customIconPreviewUrl(raw)}
                  alt=""
                  width={32}
                  height={32}
                  class="h-8 w-8 shrink-0 object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span class="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">
                  {`${translateApp(props.lang, 'services.iconCustomCurrent')} (${raw.length > 48 ? `${raw.slice(0, 48)}…` : raw})`}
                </span>
              </button>
            ) : null}

            {SERVICE_ICON_SELECT_VALUES.map((key) => {
              const selected = bound === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  class={[ADMIN_SELECT_OPTION_CLS, selected ? ADMIN_SELECT_OPTION_ACTIVE_CLS : ''].join(' ')}
                  onClick$={() => {
                    props.onChange$(key);
                    open.value = false;
                  }}
                >
                  <img
                    src={presetIconPreviewUrl(key)}
                    alt=""
                    width={32}
                    height={32}
                    class="h-8 w-8 shrink-0 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <span class="text-gray-900 dark:text-gray-100">{translateApp(props.lang, ICON_LABEL_KEYS[key])}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{translateApp(props.lang, 'services.iconHint')}</p>
    </div>
  );
});
