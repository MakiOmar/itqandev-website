import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { ADMIN_NATIVE_OPTION_CLASS, ADMIN_NATIVE_SELECT_COMPACT_CLASS } from '~/lib/admin/native-select-classes';

const PRESETS = ['none', 'wave', 'tilt', 'curve', 'triangle', 'mountains'] as const;

export type ShapeDividerEdge = {
  preset?: string;
  color?: string;
  flip?: boolean;
  height?: number;
};

export const BuilderShapeDividerFields = component$<{
  lang: string;
  settings?: Record<string, unknown>;
  onChange$: QRL<(next: Record<string, unknown>) => void | Promise<void>>;
}>((props) => {
  const raw = (props.settings?.shape_dividers || {}) as {
    top?: ShapeDividerEdge;
    bottom?: ShapeDividerEdge;
  };
  const patch = async (edge: 'top' | 'bottom', next: ShapeDividerEdge) => {
    const current = {
      ...(typeof props.settings === 'object' && props.settings ? props.settings : {}),
    };
    const dividers = { ...((current.shape_dividers as Record<string, unknown>) || {}) };
    if (!next.preset || next.preset === 'none') {
      delete dividers[edge];
    } else {
      dividers[edge] = {
        preset: next.preset,
        color: next.color || '#0389a1',
        flip: Boolean(next.flip),
        height: Math.max(16, Math.min(240, Number(next.height) || 80)),
      };
    }
    current.shape_dividers = Object.keys(dividers).length ? dividers : undefined;
    await props.onChange$(current);
  };

  return (
    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {translateApp(props.lang, 'builder.shapeDividers')}
      </p>
      {(['top', 'bottom'] as const).map((edge) => {
        const val = raw[edge] || { preset: 'none' };
        return (
          <div key={edge} class="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
            <p class="mb-1 text-[11px] font-medium capitalize text-gray-600 dark:text-gray-300">{edge}</p>
            <select
              class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} w-full`}
              value={val.preset || 'none'}
              onChange$={async (e) => {
                await patch(edge, { ...val, preset: (e.target as HTMLSelectElement).value });
              }}
            >
              {PRESETS.map((p) => (
                <option key={p} class={ADMIN_NATIVE_OPTION_CLASS} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {(val.preset || 'none') !== 'none' ? (
              <div class="mt-2 grid grid-cols-2 gap-2">
                <label class="text-[11px]">
                  {translateApp(props.lang, 'builder.background.color')}
                  <input
                    type="color"
                    class="mt-1 h-8 w-full"
                    value={val.color || '#0389a1'}
                    onInput$={async (e) => {
                      await patch(edge, { ...val, color: (e.target as HTMLInputElement).value });
                    }}
                  />
                </label>
                <label class="text-[11px]">
                  {translateApp(props.lang, 'builder.shapeHeight')}
                  <input
                    type="number"
                    min={16}
                    max={240}
                    class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-slate-900"
                    value={val.height || 80}
                    onInput$={async (e) => {
                      await patch(edge, { ...val, height: Number((e.target as HTMLInputElement).value) });
                    }}
                  />
                </label>
                <label class="col-span-2 flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(val.flip)}
                    onChange$={async (e) => {
                      await patch(edge, { ...val, flip: (e.target as HTMLInputElement).checked });
                    }}
                  />
                  {translateApp(props.lang, 'builder.shapeFlip')}
                </label>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});
