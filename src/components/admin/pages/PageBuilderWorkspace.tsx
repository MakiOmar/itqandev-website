import { component$, useSignal, $, type QRL, type Signal } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
import { MediaSelector } from '~/components/common/MediaSelector';
import { moveItem, newBlockId } from '~/lib/admin/appearance-actions';
import {
  canInsertBlockType,
  createBandWithBlock,
  createEmptyBand,
  createEmptyColumn,
  createEmptyRow,
  ensurePageLayoutBands,
  findBlockInBands,
  normalizeColumnSpans,
  updateBlockInBands,
} from '~/lib/admin/page-layout';
import {
  isAppearanceFieldTranslatable,
  writeAppearanceSettingValue,
} from '~/lib/admin/appearance-locale-settings';
import { appearanceSectionLabel } from '~/lib/i18n/appearance-labels';
import { translateApp } from '~/lib/i18n/useTranslate';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';
import type {
  AppearanceRegistryEntry,
  LayoutBreakpoint,
  PageLayoutBand,
  PageLayoutStackBelow,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';
import type { Media } from '~/types/media';

export type PageBuilderSelection =
  | { kind: 'band'; bandIndex: number }
  | { kind: 'row'; bandIndex: number; rowIndex: number }
  | { kind: 'column'; bandIndex: number; rowIndex: number; colIndex: number }
  | { kind: 'block'; bandIndex: number; rowIndex: number; colIndex: number; blockIndex: number }
  | null;

export type PageBuilderWorkspaceProps = {
  lang: string;
  pageTitle: string;
  classicEditHref: string;
  sections: Signal<PageSectionNode[]>;
  registry: Signal<AppearanceRegistryEntry[]>;
  siteLanguages: SiteLanguageRow[];
  defaultLocale: string;
  activeLocale: Signal<string>;
  onSave$: QRL<() => Promise<void>>;
  saving: Signal<boolean>;
};

export const PageBuilderWorkspace = component$<PageBuilderWorkspaceProps>((props) => {
  const bands = ensurePageLayoutBands(props.sections.value);
  const previewDevice = useSignal<LayoutBreakpoint>('desktop');
  const selection = useSignal<PageBuilderSelection>(null);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ blockId: string; key: string; accept?: string } | null>(null);
  const dragBlock = useSignal<{
    bandIndex: number;
    rowIndex: number;
    colIndex: number;
    blockIndex: number;
  } | null>(null);

  const commit$ = $(async (next: PageLayoutBand[]) => {
    props.sections.value = next;
  });

  const insertable = props.registry.value.filter((entry) =>
    canInsertBlockType(bands, props.registry.value, entry.type),
  );

  const selectedBlock =
    selection.value?.kind === 'block'
      ? bands[selection.value.bandIndex]?.rows[selection.value.rowIndex]?.columns[
          selection.value.colIndex
        ]?.blocks[selection.value.blockIndex]
      : null;

  return (
    <div class="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <header class="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-slate-900">
        <Link
          href={props.classicEditHref}
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {translateApp(props.lang, 'pages.exitBuilder')}
        </Link>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(props.lang, 'pages.builderTitle')}
            {props.pageTitle ? ` — ${props.pageTitle}` : ''}
          </p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
            {translateApp(props.lang, 'pages.builderHint')}
          </p>
        </div>
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
          class={ADMIN_PRIMARY_BUTTON_CLASS}
          disabled={props.saving.value}
          onClick$={props.onSave$}
        >
          {props.saving.value
            ? translateApp(props.lang, 'common.loading')
            : translateApp(props.lang, 'common.save')}
        </button>
      </header>

      <div class="flex min-h-0 flex-1">
        {/* Widget palette */}
        <aside class="flex w-64 flex-shrink-0 flex-col border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
          <div class="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
            {translateApp(props.lang, 'pages.widgets')}
          </div>
          <div class="space-y-2 overflow-y-auto p-3">
            <button
              type="button"
              class="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-start text-sm hover:border-primary-400 dark:border-gray-600"
              onClick$={async () => {
                await commit$([...bands, createEmptyBand()]);
              }}
            >
              {translateApp(props.lang, 'pages.addBand')}
            </button>
            <p class="pt-1 text-[11px] font-medium uppercase text-gray-400">
              {translateApp(props.lang, 'pages.blockWidgets')}
            </p>
            {insertable.map((entry) => (
              <button
                key={entry.type}
                type="button"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-start text-sm font-medium text-gray-800 hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-100 dark:hover:border-primary-500"
                onClick$={async () => {
                  const band = createBandWithBlock(props.registry.value, entry.type);
                  if (!band) return;
                  const next = [...bands, band];
                  await commit$(next);
                  const bi = next.length - 1;
                  selection.value = {
                    kind: 'block',
                    bandIndex: bi,
                    rowIndex: 0,
                    colIndex: 0,
                    blockIndex: 0,
                  };
                }}
              >
                {appearanceSectionLabel(props.lang, entry.type, entry.label)}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main class="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {bands.length === 0 ? (
            <div class="rounded-xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center dark:border-gray-700 dark:bg-slate-900/50">
              <p class="text-sm font-medium">{translateApp(props.lang, 'pages.sectionsEmptyTitle')}</p>
              <p class="mt-1 text-xs text-gray-500">{translateApp(props.lang, 'pages.layoutEmpty')}</p>
            </div>
          ) : (
            <ul class="mx-auto max-w-5xl space-y-4">
              {bands.map((band, bandIndex) => {
                const bandSelected =
                  selection.value?.kind === 'band' && selection.value.bandIndex === bandIndex;
                return (
                  <li
                    key={band.id}
                    class={[
                      'rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-900',
                      bandSelected
                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                        : 'border-gray-200 dark:border-gray-700',
                    ].join(' ')}
                  >
                    <div class="mb-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        onClick$={() => {
                          selection.value = { kind: 'band', bandIndex };
                        }}
                      >
                        {translateApp(props.lang, 'pages.band')} #{bandIndex + 1}
                      </button>
                      <span class="text-[11px] text-gray-400">
                        {band.layout_width === 'full'
                          ? translateApp(props.lang, 'appearance.layoutFull')
                          : translateApp(props.lang, 'appearance.layoutBoxed')}
                      </span>
                      <button
                        type="button"
                        class="rounded border px-2 py-0.5 text-xs dark:border-gray-600"
                        onClick$={async () => {
                          const next = bands.map((b, i) =>
                            i === bandIndex
                              ? { ...b, rows: [...b.rows, createEmptyRow(2)] }
                              : b,
                          );
                          await commit$(next);
                        }}
                      >
                        {translateApp(props.lang, 'pages.addRow')}
                      </button>
                      <button
                        type="button"
                        class="ms-auto rounded border border-red-300 px-2 py-0.5 text-xs text-red-600"
                        onClick$={async () => {
                          selection.value = null;
                          await commit$(bands.filter((_, i) => i !== bandIndex));
                        }}
                      >
                        {translateApp(props.lang, 'appearance.remove')}
                      </button>
                    </div>

                    <ul class="space-y-3">
                      {band.rows.map((row, rowIndex) => {
                        const rowSelected =
                          selection.value?.kind === 'row' &&
                          selection.value.bandIndex === bandIndex &&
                          selection.value.rowIndex === rowIndex;
                        return (
                          <li
                            key={row.id}
                            class={[
                              'rounded-lg border border-dashed p-2',
                              rowSelected
                                ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20'
                                : 'border-gray-300 dark:border-gray-600',
                            ].join(' ')}
                          >
                            <div class="mb-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                class="text-xs font-semibold uppercase text-gray-500"
                                onClick$={() => {
                                  selection.value = { kind: 'row', bandIndex, rowIndex };
                                }}
                              >
                                {translateApp(props.lang, 'pages.row')} {rowIndex + 1}
                              </button>
                              <button
                                type="button"
                                class="rounded border px-2 py-0.5 text-[11px] dark:border-gray-600"
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
                                  await commit$(next);
                                }}
                              >
                                {translateApp(props.lang, 'pages.addColumn')}
                              </button>
                            </div>
                            <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {row.columns.map((col, colIndex) => {
                                const spans = normalizeColumnSpans(col.span);
                                const colSelected =
                                  selection.value?.kind === 'column' &&
                                  selection.value.bandIndex === bandIndex &&
                                  selection.value.rowIndex === rowIndex &&
                                  selection.value.colIndex === colIndex;
                                return (
                                  <div
                                    key={col.id}
                                    class={[
                                      'rounded-md border bg-gray-50 p-2 dark:bg-slate-950',
                                      colSelected
                                        ? 'border-primary-500 ring-1 ring-primary-500/40'
                                        : 'border-gray-200 dark:border-gray-700',
                                    ].join(' ')}
                                  >
                                    <button
                                      type="button"
                                      class="mb-1 text-[11px] font-medium text-gray-600 dark:text-gray-300"
                                      onClick$={() => {
                                        selection.value = {
                                          kind: 'column',
                                          bandIndex,
                                          rowIndex,
                                          colIndex,
                                        };
                                      }}
                                    >
                                      {translateApp(props.lang, 'pages.column')} {colIndex + 1} ·{' '}
                                      {spans[previewDevice.value]}/12
                                    </button>
                                    <ul class="space-y-1">
                                      {col.blocks.map((block, blockIndex) => {
                                        const entry = props.registry.value.find(
                                          (r) => r.type === block.type,
                                        );
                                        const blockSelected =
                                          selection.value?.kind === 'block' &&
                                          selection.value.bandIndex === bandIndex &&
                                          selection.value.rowIndex === rowIndex &&
                                          selection.value.colIndex === colIndex &&
                                          selection.value.blockIndex === blockIndex;
                                        return (
                                          <li
                                            key={block.id}
                                            draggable={true}
                                            class={[
                                              'cursor-grab rounded border px-2 py-1.5 text-xs font-medium active:cursor-grabbing',
                                              blockSelected
                                                ? 'border-primary-500 bg-primary-600 text-white'
                                                : 'border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100',
                                            ].join(' ')}
                                            onClick$={() => {
                                              selection.value = {
                                                kind: 'block',
                                                bandIndex,
                                                rowIndex,
                                                colIndex,
                                                blockIndex,
                                              };
                                            }}
                                            onDragStart$={() => {
                                              dragBlock.value = {
                                                bandIndex,
                                                rowIndex,
                                                colIndex,
                                                blockIndex,
                                              };
                                            }}
                                            onDragOver$={(e) => e.preventDefault()}
                                            onDrop$={async (e) => {
                                              e.preventDefault();
                                              const from = dragBlock.value;
                                              dragBlock.value = null;
                                              if (!from) return;
                                              if (
                                                from.bandIndex !== bandIndex ||
                                                from.rowIndex !== rowIndex ||
                                                from.colIndex !== colIndex
                                              ) {
                                                return;
                                              }
                                              if (from.blockIndex === blockIndex) return;
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
                                                            from.blockIndex,
                                                            blockIndex,
                                                          ),
                                                        };
                                                      }),
                                                    };
                                                  }),
                                                };
                                              });
                                              await commit$(next);
                                              selection.value = {
                                                kind: 'block',
                                                bandIndex,
                                                rowIndex,
                                                colIndex,
                                                blockIndex,
                                              };
                                            }}
                                          >
                                            {appearanceSectionLabel(
                                              props.lang,
                                              block.type,
                                              entry?.label || block.type,
                                            )}
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
                                          const entry = props.registry.value.find(
                                            (r) => r.type === type,
                                          );
                                          if (!entry) return;
                                          if (
                                            !canInsertBlockType(
                                              bands,
                                              props.registry.value,
                                              type,
                                            )
                                          ) {
                                            return;
                                          }
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
                                                          settings: {
                                                            ...(entry.default_settings ?? {}),
                                                          },
                                                        },
                                                      ],
                                                    };
                                                  }),
                                                };
                                              }),
                                            };
                                          });
                                          await commit$(next);
                                          const newIndex =
                                            (next[bandIndex]?.rows[rowIndex]?.columns[colIndex]
                                              ?.blocks.length ?? 1) - 1;
                                          selection.value = {
                                            kind: 'block',
                                            bandIndex,
                                            rowIndex,
                                            colIndex,
                                            blockIndex: Math.max(0, newIndex),
                                          };
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
                                            {appearanceSectionLabel(
                                              props.lang,
                                              entry.type,
                                              entry.label,
                                            )}
                                          </option>
                                        ))}
                                      </select>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        {/* Inspector */}
        <aside class="flex w-80 flex-shrink-0 flex-col border-s border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
          <div class="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
            {translateApp(props.lang, 'pages.inspector')}
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            {!selection.value ? (
              <p class="text-xs text-gray-500">{translateApp(props.lang, 'pages.inspectorEmpty')}</p>
            ) : null}

            {selection.value?.kind === 'band' ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {translateApp(props.lang, 'pages.band')} #{selection.value.bandIndex + 1}
                </p>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(props.lang, 'appearance.layoutWidth')}
                  <select
                    class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                    value={bands[selection.value.bandIndex]?.layout_width || 'boxed'}
                    onChange$={async (e) => {
                      const layout_width = (e.target as HTMLSelectElement).value as
                        | 'boxed'
                        | 'full';
                      const bi = selection.value!.bandIndex;
                      await commit$(
                        bands.map((b, i) => (i === bi ? { ...b, layout_width } : b)),
                      );
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
              </div>
            ) : null}

            {selection.value?.kind === 'row' ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {translateApp(props.lang, 'pages.row')} {selection.value.rowIndex + 1}
                </p>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(props.lang, 'pages.stackBelow')}
                  <select
                    class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                    value={
                      bands[selection.value.bandIndex]?.rows[selection.value.rowIndex]
                        ?.stack_below || 'none'
                    }
                    onChange$={async (e) => {
                      const stack_below = (e.target as HTMLSelectElement)
                        .value as PageLayoutStackBelow;
                      const { bandIndex, rowIndex } = selection.value as {
                        bandIndex: number;
                        rowIndex: number;
                      };
                      await commit$(
                        bands.map((b, bi) => {
                          if (bi !== bandIndex) return b;
                          return {
                            ...b,
                            rows: b.rows.map((r, ri) =>
                              ri === rowIndex ? { ...r, stack_below } : r,
                            ),
                          };
                        }),
                      );
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
              </div>
            ) : null}

            {selection.value?.kind === 'column' ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {translateApp(props.lang, 'pages.column')} {selection.value.colIndex + 1}
                </p>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(props.lang, 'pages.span')} (
                  {translateApp(props.lang, `pages.device.${previewDevice.value}`)})
                  <input
                    type="number"
                    min={1}
                    max={12}
                    class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                    value={
                      normalizeColumnSpans(
                        bands[selection.value.bandIndex]?.rows[selection.value.rowIndex]
                          ?.columns[selection.value.colIndex]?.span,
                      )[previewDevice.value]
                    }
                    onInput$={async (e) => {
                      const n = Number((e.target as HTMLInputElement).value);
                      const { bandIndex, rowIndex, colIndex } = selection.value as {
                        bandIndex: number;
                        rowIndex: number;
                        colIndex: number;
                      };
                      await commit$(
                        bands.map((b, bi) => {
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
                        }),
                      );
                    }}
                  />
                </label>
              </div>
            ) : null}

            {selection.value?.kind === 'block' && selectedBlock ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {appearanceSectionLabel(
                    props.lang,
                    selectedBlock.type,
                    props.registry.value.find((r) => r.type === selectedBlock.type)?.label ||
                      selectedBlock.type,
                  )}
                </p>
                {(() => {
                  const entry = props.registry.value.find((r) => r.type === selectedBlock.type);
                  if (!(entry?.settings_fields?.length ?? 0)) {
                    return (
                      <p class="text-xs text-gray-400">
                        {translateApp(props.lang, 'appearance.noSectionSettings')}
                      </p>
                    );
                  }
                  return (
                    <AppearanceSettingsFields
                      fields={entry!.settings_fields!}
                      values={selectedBlock.settings ?? {}}
                      onSettingsChange$={async (nextSettings) => {
                        await commit$(
                          updateBlockInBands(bands, selectedBlock.id, (blk) => ({
                            ...blk,
                            settings: nextSettings,
                          })),
                        );
                      }}
                      onPickMedia$={async (key, accept) => {
                        mediaTarget.value = { blockId: selectedBlock.id, key, accept };
                      }}
                      languages={props.siteLanguages}
                      defaultLocale={props.defaultLocale}
                      activeLocale={props.activeLocale.value}
                      onLocaleChange$={$((code) => {
                        props.activeLocale.value = code;
                      })}
                      mediaPreviewById={mediaPreviewById.value}
                      onMediaPreview$={$((mediaId, url) => {
                        mediaPreviewById.value = {
                          ...mediaPreviewById.value,
                          [String(mediaId)]: url,
                        };
                      })}
                    />
                  );
                })()}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {mediaTarget.value ? (
        <MediaSelector
          title={translateApp(props.lang, 'appearance.selectImage')}
          accept={mediaTarget.value.accept || 'image/*'}
          onSelect={$((media: Media) => {
            const target = mediaTarget.value;
            mediaTarget.value = null;
            if (!target || !media.id) return;
            const url = media.url || media.thumbnailUrl || '';
            if (url) {
              mediaPreviewById.value = {
                ...mediaPreviewById.value,
                [String(media.id)]: url,
              };
            }
            const current = ensurePageLayoutBands(props.sections.value);
            const block = findBlockInBands(current, target.blockId);
            const entry = props.registry.value.find((r) => r.type === block?.type);
            const field = entry?.settings_fields?.find((f) => f.key === target.key);
            const translatable = field ? isAppearanceFieldTranslatable(field) : false;
            props.sections.value = updateBlockInBands(current, target.blockId, (blk) => ({
              ...blk,
              settings: writeAppearanceSettingValue(
                blk.settings ?? {},
                target.key,
                media.id,
                props.activeLocale.value,
                props.defaultLocale,
                translatable,
              ),
            }));
          })}
          onClose={$(() => {
            mediaTarget.value = null;
          })}
        />
      ) : null}
    </div>
  );
});
