import { component$, useSignal, useVisibleTask$, type QRL } from '@builder.io/qwik';
import { fetchChromeLayoutsFromBrowser } from '~/lib/admin/chrome-layout-actions';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { ChromeLayoutMeta } from '~/types/chrome-layout';
import { INSPECTOR_INPUT, INSPECTOR_LABEL, INSPECTOR_ROW } from './inspector-classes';

export type LoopItemSelectFieldProps = {
  lang: string;
  label: string;
  /** Saved loop item layout id; 0 means the built-in card. */
  value: number;
  onChange$: QRL<(id: number | null) => void>;
};

/**
 * Picks the loop item layout a loop grid renders per record.
 * Drafts are only listed when already selected, so saved grids are not silently reset.
 */
export const LoopItemSelectField = component$<LoopItemSelectFieldProps>((props) => {
  const layouts = useSignal<ChromeLayoutMeta[] | null>(null);
  const error = useSignal('');

  useVisibleTask$(async () => {
    try {
      layouts.value = await fetchChromeLayoutsFromBrowser('loop_item');
    } catch (e) {
      layouts.value = [];
      error.value = e instanceof Error ? e.message : translateApp(props.lang, 'appearance.loopItemsLoadFailed');
    }
  });

  const current = props.value > 0 ? props.value : 0;
  const options = (layouts.value ?? []).filter((row) => row.status === 'published' || row.id === current);
  const missingCurrent = current > 0 && layouts.value !== null && !options.some((row) => row.id === current);
  const selectId = 'setting-loop-item';

  return (
    <div class={INSPECTOR_ROW}>
      <label for={selectId} class={INSPECTOR_LABEL}>{props.label}</label>
      {layouts.value === null ? (
        <p class="text-xs text-gray-500">{translateApp(props.lang, 'appearance.loopItemsLoading')}</p>
      ) : (
        <select
          id={selectId}
          class={INSPECTOR_INPUT}
          value={String(current)}
          onChange$={async (e) => {
            const id = Number((e.target as HTMLSelectElement).value);
            await props.onChange$(id > 0 ? id : null);
          }}
        >
          <option value="0" selected={current === 0}>
            {translateApp(props.lang, 'appearance.loopItemDefaultCard')}
          </option>
          {missingCurrent ? (
            <option value={String(current)} selected>
              {`#${current} (${translateApp(props.lang, 'appearance.loopItemUnavailable')})`}
            </option>
          ) : null}
          {options.map((row) => (
            <option key={row.id} value={String(row.id)} selected={row.id === current}>
              {row.status === 'published'
                ? row.name
                : `${row.name} — ${translateApp(props.lang, 'appearance.formNotPublished')}`}
            </option>
          ))}
        </select>
      )}
      {error.value ? <p class="mt-1 text-xs text-red-600">{error.value}</p> : null}
    </div>
  );
});
