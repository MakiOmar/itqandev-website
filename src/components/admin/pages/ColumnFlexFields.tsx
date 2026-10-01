/**
 * Column → Content: flexbox layout for the blocks inside a column.
 */
import { component$, $, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
} from '~/lib/admin/native-select-classes';
import { translateApp } from '~/lib/i18n/useTranslate';
import { DEFAULT_COLUMN_FLEX } from '~/lib/marketing/page-layout-utils';
import type {
  ColumnFlex,
  ColumnFlexAlign,
  ColumnFlexJustify,
} from '~/lib/marketing/appearance-types';

const JUSTIFY_OPTIONS: ColumnFlexJustify[] = ['start', 'center', 'end', 'between', 'around', 'evenly'];
const ALIGN_OPTIONS: ColumnFlexAlign[] = ['stretch', 'start', 'center', 'end'];

const LABEL_CLASS = 'block text-xs font-medium text-gray-600 dark:text-gray-300';

export const ColumnFlexFields = component$<{
  lang: string;
  flex: ColumnFlex | undefined;
  onChange$: QRL<(next: ColumnFlex | undefined) => void | Promise<void>>;
}>((props) => {
  const flex = props.flex;
  const patch$ = $(async (part: Partial<ColumnFlex>) => {
    await props.onChange$({ ...DEFAULT_COLUMN_FLEX, ...props.flex, ...part });
  });

  return (
    <div class="space-y-3 rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
      {/* Toggle: off keeps the legacy vertical stack */}
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {translateApp(props.lang, 'pages.columnFlex')}
        </span>
        <AdminSwitch
          checked={!!flex}
          ariaLabel={translateApp(props.lang, 'pages.columnFlex')}
          onChange$={$(async (checked: boolean) => {
            await props.onChange$(checked ? { ...DEFAULT_COLUMN_FLEX } : undefined);
          })}
        />
      </div>
      {!flex ? (
        <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
          {translateApp(props.lang, 'pages.columnFlexHint')}
        </p>
      ) : (
        <>
          {/* Direction */}
          <label class={LABEL_CLASS}>
            {translateApp(props.lang, 'pages.flexDirection')}
            <select
              class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
              value={flex.direction}
              onChange$={(e) =>
                patch$({ direction: (e.target as HTMLSelectElement).value === 'row' ? 'row' : 'column' })
              }
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="column">
                {translateApp(props.lang, 'pages.flexDirectionColumn')}
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="row">
                {translateApp(props.lang, 'pages.flexDirectionRow')}
              </option>
            </select>
          </label>
          {/* Main-axis distribution */}
          <label class={LABEL_CLASS}>
            {translateApp(props.lang, 'pages.flexJustify')}
            <select
              class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
              value={flex.justify}
              onChange$={(e) =>
                patch$({ justify: (e.target as HTMLSelectElement).value as ColumnFlexJustify })
              }
            >
              {JUSTIFY_OPTIONS.map((value) => (
                <option key={value} class={ADMIN_NATIVE_OPTION_CLASS} value={value}>
                  {translateApp(props.lang, `pages.flexJustify_${value}`)}
                </option>
              ))}
            </select>
          </label>
          {/* Cross-axis alignment */}
          <label class={LABEL_CLASS}>
            {translateApp(props.lang, 'pages.flexAlign')}
            <select
              class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
              value={flex.align}
              onChange$={(e) =>
                patch$({ align: (e.target as HTMLSelectElement).value as ColumnFlexAlign })
              }
            >
              {ALIGN_OPTIONS.map((value) => (
                <option key={value} class={ADMIN_NATIVE_OPTION_CLASS} value={value}>
                  {translateApp(props.lang, `pages.flexAlign_${value}`)}
                </option>
              ))}
            </select>
          </label>
          {/* Gap */}
          <label class={LABEL_CLASS}>
            {translateApp(props.lang, 'pages.flexGap')}
            <input
              type="number"
              min={0}
              max={16}
              class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
              value={flex.gap}
              onChange$={(e) => {
                const n = Math.round(Number((e.target as HTMLInputElement).value));
                return patch$({ gap: Number.isFinite(n) ? Math.min(16, Math.max(0, n)) : 0 });
              }}
            />
          </label>
          {/* Wrap */}
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
              {translateApp(props.lang, 'pages.flexWrap')}
            </span>
            <AdminSwitch
              checked={flex.wrap}
              ariaLabel={translateApp(props.lang, 'pages.flexWrap')}
              onChange$={$((checked: boolean) => patch$({ wrap: checked }))}
            />
          </div>
        </>
      )}
    </div>
  );
});
