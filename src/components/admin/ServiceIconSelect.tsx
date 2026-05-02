import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '../../lib/i18n/useTranslate';
import {
  SERVICE_ICON_SELECT_VALUES,
  isPresetServiceIconKey,
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

/**
 * Preset marketing icons from `/public/icons` (plus empty = default from slug at render time).
 */
export const ServiceIconSelect = component$<{
  id: string;
  /** Current stored icon (keyword, alias, or custom path/URL). */
  value: string;
  lang: string;
  onChange$: QRL<(value: string) => void>;
}>((props) => {
  const raw = (props.value ?? '').trim();
  const bound = serviceIconSelectBoundValue(props.value);
  const showCustomOption = raw !== '' && !isPresetServiceIconKey(raw);
  const selectValue = bound;

  return (
    <div>
      <select
        id={props.id}
        name="icon"
        class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
        value={selectValue}
        onChange$={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          props.onChange$(v);
        }}
      >
        <option value="">{translateApp(props.lang, 'services.iconNone')}</option>
        {showCustomOption ? (
          <option value={raw}>
            {`${translateApp(props.lang, 'services.iconCustomCurrent')} (${raw.length > 48 ? `${raw.slice(0, 48)}…` : raw})`}
          </option>
        ) : null}
        {SERVICE_ICON_SELECT_VALUES.map((key) => (
          <option key={key} value={key}>
            {translateApp(props.lang, ICON_LABEL_KEYS[key])}
          </option>
        ))}
      </select>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{translateApp(props.lang, 'services.iconHint')}</p>
    </div>
  );
});
