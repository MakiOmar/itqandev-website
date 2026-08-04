import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import { moveItem, newBlockId } from '~/lib/admin/appearance-actions';
import {
  canInsertBlockType,
  createBandWithBlock,
  createEmptyBand,
  createEmptyColumn,
  createEmptyRow,
  ensurePageLayoutBands,
  normalizeColumnSpans,
} from '~/lib/admin/page-layout';
import { appearanceSectionLabel } from '~/lib/i18n/appearance-labels';
import { translateApp } from '~/lib/i18n/useTranslate';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
} from '~/lib/admin/native-select-classes';
import type {
  AppearanceRegistryEntry,
  LayoutBreakpoint,
  PageLayoutBand,
  PageLayoutStackBelow,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';

export type PageSectionsEditorProps = {
  lang: string;
  sections: PageSectionNode[];
  registry: AppearanceRegistryEntry[];
  onChange$: QRL<(next: PageSectionNode[]) => void>;
  onPickMedia$: QRL<(blockId: string, key: string, accept?: string) => void>;
  languages?: SiteLanguageRow[];
  defaultLocale?: string;
  activeLocale?: string;
  onLocaleChange$?: QRL<(code: string) => void>;
  mediaPreviewById?: Record<string, string>;
  onMediaPreview$?: QRL<(mediaId: number, url: string) => void>;
};

async function commitBands(
  bands: PageLayoutBand[],
  onChange$: QRL<(next: PageSectionNode[]) => void>,
): Promise<void> {
  await onChange$(bands);
}

export const PageSectionsEditor = component$<PageSectionsEditorProps>((props) => {
  const bands = ensurePageLayoutBands(props.sections);
  const previewDevice = useSignal<LayoutBreakpoint>('desktop');
  const expandedBlockId = useSignal<string | null>(null);

  const insertable = props.registry.filter((entry) =>
    canInsertBlockType(bands, props.registry, entry.type),
  );

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0 text-start">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(props.lang, 'pages.sections')}
          </h3>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {translateApp(props.lang, 'pages.layoutHint')}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
            {(['mobile', 'tablet', 'desktop'] as LayoutBreakpoint[]).map((device) => (
              <button
                key={device}
                type="button"
                class={[
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  previewDevice.value === device
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
                onClick$={() => {
                  previewDevice.value = device;
                }}
              >
                {translateApp(props.lang, `pages.device.${device}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
            onClick$={async () => {
              await commitBands([...bands, createEmptyBand()], props.onChange$);
            }}
          >
            {translateApp(props.lang, 'pages.addBand')}
          </button>
          {insertable.length > 0 ? (
            <select
              class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
              value=""
              aria-label={translateApp(props.lang, 'pages.addSection')}
              onChange$={async (e) => {
                const type = (e.target as HTMLSelectElement).value;
                (e.target as HTMLSelectElement).value = '';
                if (!type) return;
                const band = createBandWithBlock(props.registry, type);
                if (!band) return;
                await commitBands([...bands, band], props.onChange$);
              }}
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                {translateApp(props.lang, 'pages.addBlockBand')}
              </option>
              {insertable.map((entry) => (
                <option class={ADMIN_NATIVE_OPTION_CLASS} key={entry.type} value={entry.type}>
                  {appearanceSectionLabel(props.lang, entry.type, entry.label)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {bands.length === 0 ? (
        <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-4 py-8 text-center dark:border-gray-600 dark:bg-gray-950/40">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
            {translateApp(props.lang, 'pages.sectionsEmptyTitle')}
          </p>
          <p class="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
            {translateApp(props.lang, 'pages.layoutEmpty')}
          </p>
          {insertable.length > 0 ? (
            <div class="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
              {insertable.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-3 text-start text-sm font-medium text-gray-800 shadow-sm transition hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-primary-500 dark:hover:bg-gray-800"
                  onClick$={async () => {
                    const band = createBandWithBlock(props.registry, entry.type);
                    if (!band) return;
                    await commitBands([band], props.onChange$);
                  }}
                >
                  {appearanceSectionLabel(props.lang, entry.type, entry.label)}
                </button>
              ))}
            </div>
          ) : (
            <p class="mt-4 text-xs text-gray-400">{translateApp(props.lang, 'pages.sectionsLoading')}</p>
          )}
        </div>
      ) : (
        <ul class="space-y-4">
          {bands.map((band, bandIndex) => (
            <li
              key={band.id}
              class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/50"
            >
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {translateApp(props.lang, 'pages.band')} #{bandIndex + 1}
                </span>
                <AdminSwitch
                  checked={band.enabled !== false}
                  label={translateApp(props.lang, 'appearance.enabled')}
                  onChange$={async (enabled) => {
                    const next = bands.map((b, i) => (i === bandIndex ? { ...b, enabled } : b));
                    await commitBands(next, props.onChange$);
                  }}
                />
                <label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                  {translateApp(props.lang, 'appearance.layoutWidth')}
                  <select
                    class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
                    value={band.layout_width || 'boxed'}
                    onChange$={async (e) => {
                      const layout_width = (e.target as HTMLSelectElement).value as
                        | 'boxed'
                        | 'full';
                      const next = bands.map((b, i) =>
                        i === bandIndex ? { ...b, layout_width } : b,
                      );
                      await commitBands(next, props.onChange$);
                    }}
                  >
                    <option class={ADMIN_NATIVE_OPTION_CLASS} value="boxed">
                      {translateApp(props.lang, 'appearance.layoutBoxed')}
                    </option>
                    <option class={ADMIN_NATIVE_OPTION_CLASS} value="full">
                      {translateApp(props.lang, 'appearance.layoutFull')}
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 disabled:opacity-40"
                  disabled={bandIndex === 0}
                  onClick$={async () => {
                    await commitBands(moveItem(bands, bandIndex, bandIndex - 1), props.onChange$);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 disabled:opacity-40"
                  disabled={bandIndex >= bands.length - 1}
                  onClick$={async () => {
                    await commitBands(moveItem(bands, bandIndex, bandIndex + 1), props.onChange$);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                  onClick$={async () => {
                    const next = bands.map((b, i) =>
                      i === bandIndex
                        ? { ...b, rows: [...b.rows, createEmptyRow(2)] }
                        : b,
                    );
                    await commitBands(next, props.onChange$);
                  }}
                >
                  {translateApp(props.lang, 'pages.addRow')}
                </button>
                <button
                  type="button"
                  class="ms-auto rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-800"
                  onClick$={async () => {
                    await commitBands(
                      bands.filter((_, i) => i !== bandIndex),
                      props.onChange$,
                    );
                  }}
                >
                  {translateApp(props.lang, 'appearance.remove')}
                </button>
              </div>

              <ul class="space-y-3">
                {band.rows.map((row, rowIndex) => (
                  <li
                    key={row.id}
                    class="rounded-md border border-dashed border-gray-300 bg-gray-50/70 p-3 dark:border-gray-600 dark:bg-gray-950/30"
                  >
                    <div class="mb-2 flex flex-wrap items-center gap-2">
                      <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {translateApp(props.lang, 'pages.row')} {rowIndex + 1}
                      </span>
                      <label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                        {translateApp(props.lang, 'pages.stackBelow')}
                        <select
                          class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
                          value={row.stack_below || 'none'}
                          onChange$={async (e) => {
                            const stack_below = (e.target as HTMLSelectElement)
                              .value as PageLayoutStackBelow;
                            const next = bands.map((b, bi) => {
                              if (bi !== bandIndex) return b;
                              return {
                                ...b,
                                rows: b.rows.map((r, ri) =>
                                  ri === rowIndex ? { ...r, stack_below } : r,
                                ),
                              };
                            });
                            await commitBands(next, props.onChange$);
                          }}
                        >
                          <option class={ADMIN_NATIVE_OPTION_CLASS} value="none">
                            {translateApp(props.lang, 'pages.stackNone')}
                          </option>
                          <option class={ADMIN_NATIVE_OPTION_CLASS} value="tablet">
                            {translateApp(props.lang, 'pages.stackTablet')}
                          </option>
                          <option class={ADMIN_NATIVE_OPTION_CLASS} value="desktop">
                            {translateApp(props.lang, 'pages.stackDesktop')}
                          </option>
                        </select>
                      </label>
                      <button
                        type="button"
                        class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                        onClick$={async () => {
                          const next = bands.map((b, bi) => {
                            if (bi !== bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) =>
                                ri === rowIndex
                                  ? {
                                      ...r,
                                      columns: [...r.columns, createEmptyColumn(6)],
                                    }
                                  : r,
                              ),
                            };
                          });
                          await commitBands(next, props.onChange$);
                        }}
                      >
                        {translateApp(props.lang, 'pages.addColumn')}
                      </button>
                      <button
                        type="button"
                        class="ms-auto rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-800"
                        disabled={band.rows.length <= 1}
                        onClick$={async () => {
                          const next = bands.map((b, bi) => {
                            if (bi !== bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.filter((_, ri) => ri !== rowIndex),
                            };
                          });
                          await commitBands(next, props.onChange$);
                        }}
                      >
                        {translateApp(props.lang, 'pages.removeRow')}
                      </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {row.columns.map((col, colIndex) => {
                        const spans = normalizeColumnSpans(col.span);
                        const activeSpan = spans[previewDevice.value];
                        return (
                          <div
                            key={col.id}
                            class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div class="mb-2 flex flex-wrap items-center gap-2">
                              <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
                                {translateApp(props.lang, 'pages.column')} {colIndex + 1}
                              </span>
                              <label class="flex items-center gap-1 text-xs">
                                {translateApp(props.lang, 'pages.span')} (
                                {translateApp(props.lang, `pages.device.${previewDevice.value}`)})
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  class="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-950"
                                  value={activeSpan}
                                  onInput$={async (e) => {
                                    const n = Number((e.target as HTMLInputElement).value);
                                    const next = bands.map((b, bi) => {
                                      if (bi !== bandIndex) return b;
                                      return {
                                        ...b,
                                        rows: b.rows.map((r, ri) => {
                                          if (ri !== rowIndex) return r;
                                          return {
                                            ...r,
                                            columns: r.columns.map((c, ci) => {
                                              if (ci !== colIndex) return c;
                                              return {
                                                ...c,
                                                span: {
                                                  ...normalizeColumnSpans(c.span),
                                                  [previewDevice.value]: Math.min(
                                                    12,
                                                    Math.max(1, Math.round(n) || 1),
                                                  ),
                                                },
                                              };
                                            }),
                                          };
                                        }),
                                      };
                                    });
                                    await commitBands(next, props.onChange$);
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                class="ms-auto rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 dark:border-red-800"
                                disabled={row.columns.length <= 1}
                                onClick$={async () => {
                                  const next = bands.map((b, bi) => {
                                    if (bi !== bandIndex) return b;
                                    return {
                                      ...b,
                                      rows: b.rows.map((r, ri) => {
                                        if (ri !== rowIndex) return r;
                                        return {
                                          ...r,
                                          columns: r.columns.filter((_, ci) => ci !== colIndex),
                                        };
                                      }),
                                    };
                                  });
                                  await commitBands(next, props.onChange$);
                                }}
                              >
                                {translateApp(props.lang, 'appearance.remove')}
                              </button>
                            </div>

                            <ul class="space-y-2">
                              {col.blocks.map((block, blockIndex) => {
                                const entry = props.registry.find((r) => r.type === block.type);
                                const open = expandedBlockId.value === block.id;
                                return (
                                  <li
                                    key={block.id}
                                    class="rounded border border-gray-200 dark:border-gray-700"
                                  >
                                    <div class="flex flex-wrap items-center gap-1 px-2 py-1.5">
                                      <button
                                        type="button"
                                        class="text-start text-xs font-medium text-gray-800 dark:text-gray-100"
                                        onClick$={() => {
                                          expandedBlockId.value = open ? null : block.id;
                                        }}
                                      >
                                        {appearanceSectionLabel(
                                          props.lang,
                                          block.type,
                                          entry?.label || block.type,
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        class="rounded border px-1 text-[10px] disabled:opacity-40"
                                        disabled={blockIndex === 0}
                                        onClick$={async () => {
                                          const next = bands.map((b, bi) => {
                                            if (bi !== bandIndex) return b;
                                            return {
                                              ...b,
                                              rows: b.rows.map((r, ri) => {
                                                if (ri !== rowIndex) return r;
                                                return {
                                                  ...r,
                                                  columns: r.columns.map((c, ci) => {
                                                    if (ci !== colIndex) return c;
                                                    return {
                                                      ...c,
                                                      blocks: moveItem(
                                                        c.blocks,
                                                        blockIndex,
                                                        blockIndex - 1,
                                                      ),
                                                    };
                                                  }),
                                                };
                                              }),
                                            };
                                          });
                                          await commitBands(next, props.onChange$);
                                        }}
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        class="rounded border px-1 text-[10px] disabled:opacity-40"
                                        disabled={blockIndex >= col.blocks.length - 1}
                                        onClick$={async () => {
                                          const next = bands.map((b, bi) => {
                                            if (bi !== bandIndex) return b;
                                            return {
                                              ...b,
                                              rows: b.rows.map((r, ri) => {
                                                if (ri !== rowIndex) return r;
                                                return {
                                                  ...r,
                                                  columns: r.columns.map((c, ci) => {
                                                    if (ci !== colIndex) return c;
                                                    return {
                                                      ...c,
                                                      blocks: moveItem(
                                                        c.blocks,
                                                        blockIndex,
                                                        blockIndex + 1,
                                                      ),
                                                    };
                                                  }),
                                                };
                                              }),
                                            };
                                          });
                                          await commitBands(next, props.onChange$);
                                        }}
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        class="ms-auto rounded border border-red-300 px-1 text-[10px] text-red-600"
                                        onClick$={async () => {
                                          const next = bands.map((b, bi) => {
                                            if (bi !== bandIndex) return b;
                                            return {
                                              ...b,
                                              rows: b.rows.map((r, ri) => {
                                                if (ri !== rowIndex) return r;
                                                return {
                                                  ...r,
                                                  columns: r.columns.map((c, ci) => {
                                                    if (ci !== colIndex) return c;
                                                    return {
                                                      ...c,
                                                      blocks: c.blocks.filter(
                                                        (_, i) => i !== blockIndex,
                                                      ),
                                                    };
                                                  }),
                                                };
                                              }),
                                            };
                                          });
                                          await commitBands(next, props.onChange$);
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                    {open ? (
                                      <div class="border-t border-gray-200 p-2 dark:border-gray-700">
                                        {(entry?.settings_fields?.length ?? 0) > 0 ? (
                                          <AppearanceSettingsFields
                                            fields={entry!.settings_fields!}
                                            values={block.settings ?? {}}
                                            onSettingsChange$={async (nextSettings) => {
                                              const next = bands.map((b, bi) => {
                                                if (bi !== bandIndex) return b;
                                                return {
                                                  ...b,
                                                  rows: b.rows.map((r, ri) => {
                                                    if (ri !== rowIndex) return r;
                                                    return {
                                                      ...r,
                                                      columns: r.columns.map((c, ci) => {
                                                        if (ci !== colIndex) return c;
                                                        return {
                                                          ...c,
                                                          blocks: c.blocks.map((blk, i) =>
                                                            i === blockIndex
                                                              ? { ...blk, settings: nextSettings }
                                                              : blk,
                                                          ),
                                                        };
                                                      }),
                                                    };
                                                  }),
                                                };
                                              });
                                              await commitBands(next, props.onChange$);
                                            }}
                                            onPickMedia$={async (key, accept) => {
                                              await props.onPickMedia$(block.id, key, accept);
                                            }}
                                            languages={props.languages}
                                            defaultLocale={props.defaultLocale}
                                            activeLocale={props.activeLocale}
                                            onLocaleChange$={props.onLocaleChange$}
                                            mediaPreviewById={props.mediaPreviewById}
                                            onMediaPreview$={props.onMediaPreview$}
                                          />
                                        ) : (
                                          <p class="text-xs text-gray-400">
                                            {translateApp(props.lang, 'appearance.noSectionSettings')}
                                          </p>
                                        )}
                                      </div>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>

                            {insertable.length > 0 ? (
                              <select
                                class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-2 w-full`}
                                value=""
                                onChange$={async (e) => {
                                  const type = (e.target as HTMLSelectElement).value;
                                  (e.target as HTMLSelectElement).value = '';
                                  if (!type) return;
                                  const entry = props.registry.find((r) => r.type === type);
                                  if (!entry) return;
                                  if (!canInsertBlockType(bands, props.registry, type)) return;
                                  const next = bands.map((b, bi) => {
                                    if (bi !== bandIndex) return b;
                                    return {
                                      ...b,
                                      rows: b.rows.map((r, ri) => {
                                        if (ri !== rowIndex) return r;
                                        return {
                                          ...r,
                                          columns: r.columns.map((c, ci) => {
                                            if (ci !== colIndex) return c;
                                            return {
                                              ...c,
                                              blocks: [
                                                ...c.blocks,
                                                {
                                                  id: newBlockId(type),
                                                  type,
                                                  enabled: true,
                                                  settings: { ...(entry.default_settings ?? {}) },
                                                },
                                              ],
                                            };
                                          }),
                                        };
                                      }),
                                    };
                                  });
                                  await commitBands(next, props.onChange$);
                                }}
                              >
                                <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                                  {translateApp(props.lang, 'pages.addBlock')}
                                </option>
                                {insertable.map((entry) => (
                                  <option
                                    class={ADMIN_NATIVE_OPTION_CLASS}
                                    key={entry.type}
                                    value={entry.type}
                                  >
                                    {appearanceSectionLabel(props.lang, entry.type, entry.label)}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
