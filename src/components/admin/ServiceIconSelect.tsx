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
        class="relative z-50 flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-primary-700/40"
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
        <svg class="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
            class="fixed inset-0 z-40 cursor-default bg-black/10 dark:bg-black/30"
            aria-hidden="true"
            onClick$={() => {
              open.value = false;
            }}
          />
          <div
            id={listboxId}
            role="listbox"
            class="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <button
              type="button"
              role="option"
              aria-selected={bound === ''}
              class={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${bound === '' ? 'bg-primary-50 dark:bg-primary-950/40' : ''}`}
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
                class={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${bound === raw ? 'bg-primary-50 dark:bg-primary-950/40' : ''}`}
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
                  class={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${selected ? 'bg-primary-50 dark:bg-primary-950/40' : ''}`}
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
