import { component$, type QRL } from '@builder.io/qwik';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';
import {
  GRID_COLUMN_OPTIONS,
  normalizeResponsiveColumns,
  type ResponsiveColumns,
} from '~/lib/marketing/grid-columns';
import { translateApp } from '~/lib/i18n/useTranslate';

export type ResponsiveColumnsFieldProps = {
  lang: string;
  label: string;
  value: ResponsiveColumns;
  onChange$: QRL<(columns: ResponsiveColumns) => void>;
};

/**
 * Mobile / tablet / desktop column count pickers for card grids.
 */
export const ResponsiveColumnsField = component$<ResponsiveColumnsFieldProps>((props) => {
  const columns = normalizeResponsiveColumns(props.value);

  const update = async (key: keyof ResponsiveColumns, raw: string) => {
    const next = { ...columns, [key]: Number(raw) || 1 };
    await props.onChange$(normalizeResponsiveColumns(next));
  };

  const breakpoints: Array<{ key: keyof ResponsiveColumns; labelKey: string }> = [
    { key: 'mobile', labelKey: 'appearance.columnsMobile' },
    { key: 'tablet', labelKey: 'appearance.columnsTablet' },
    { key: 'desktop', labelKey: 'appearance.columnsDesktop' },
  ];

  return (
    <div class="md:col-span-2">
      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{props.label}</label>
      <div class="grid gap-3 sm:grid-cols-3">
        {breakpoints.map(({ key, labelKey }) => (
          <div key={key}>
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              {translateApp(props.lang, labelKey)}
            </label>
            <select
              class={ADMIN_NATIVE_SELECT_CLASS}
              value={String(columns[key])}
              onChange$={async (e) => {
                await update(key, (e.target as HTMLSelectElement).value);
              }}
            >
              {GRID_COLUMN_OPTIONS.map((n) => (
                <option key={n} class={ADMIN_NATIVE_OPTION_CLASS} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
});
