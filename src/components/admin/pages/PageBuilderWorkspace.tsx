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
  effectiveSpanForDevice,
  previewColSpanClass,
} from '~/lib/marketing/page-layout-utils';
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
  PageLayoutBlock,
  PageLayoutStackBelow,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';
import type { Media } from '~/types/media';

const WIDGET_DND = 'application/x-credocode-widget';

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

type BlockPath = {
  bandIndex: number;
  rowIndex: number;
  colIndex: number;
  blockIndex: number;
};

/** Module-level so `$` handlers do not capture non-serializable closures. */
function insertWidgetIntoColumn(
  bands: PageLayoutBand[],
  registry: AppearanceRegistryEntry[],
  type: string,
  bandIndex: number,
  rowIndex: number,
  colIndex: number,
): { bands: PageLayoutBand[]; blockIndex: number } | null {
  if (!canInsertBlockType(bands, registry, type)) return null;
  const entry = registry.find((r) => r.type === type);
  if (!entry) return null;
  const block: PageLayoutBlock = {
    id: newBlockId(type),
    type,
    enabled: true,
    settings: { ...(entry.default_settings ?? {}) },
  };
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
            return { ...c, blocks: [...c.blocks, block] };
          }),
        };
      }),
    };
  });
  const blockIndex =
    (next[bandIndex]?.rows[rowIndex]?.columns[colIndex]?.blocks.length ?? 1) - 1;
  return { bands: next, blockIndex: Math.max(0, blockIndex) };
}

function moveBlockToColumn(
  bands: PageLayoutBand[],
  from: BlockPath,
  toBand: number,
  toRow: number,
  toCol: number,
  toIndex?: number,
): { bands: PageLayoutBand[]; blockIndex: number } | null {
  const sourceCol = bands[from.bandIndex]?.rows[from.rowIndex]?.columns[from.colIndex];
  const block = sourceCol?.blocks[from.blockIndex];
  if (!block) return null;

  const sameColumn =
    from.bandIndex === toBand && from.rowIndex === toRow && from.colIndex === toCol;

  if (sameColumn) {
    const target = toIndex ?? from.blockIndex;
    if (target === from.blockIndex) {
      return { bands, blockIndex: from.blockIndex };
    }
    const next = bands.map((b, bi) => {
      if (bi !== from.bandIndex) return b;
      return {
        ...b,
        rows: b.rows.map((r, ri) => {
          if (ri !== from.rowIndex) return r;
          return {
            ...r,
            columns: r.columns.map((c, ci) => {
              if (ci !== from.colIndex) return c;
              return { ...c, blocks: moveItem(c.blocks, from.blockIndex, target) };
            }),
          };
        }),
      };
    });
    return { bands: next, blockIndex: target };
  }

  let insertAt = toIndex;
  const stripped = bands.map((b, bi) => {
    if (bi !== from.bandIndex) return b;
    return {
      ...b,
      rows: b.rows.map((r, ri) => {
        if (ri !== from.rowIndex) return r;
        return {
          ...r,
          columns: r.columns.map((c, ci) => {
            if (ci !== from.colIndex) return c;
            return { ...c, blocks: c.blocks.filter((_, i) => i !== from.blockIndex) };
          }),
        };
      }),
    };
  });

  const next = stripped.map((b, bi) => {
    if (bi !== toBand) return b;
    return {
      ...b,
      rows: b.rows.map((r, ri) => {
        if (ri !== toRow) return r;
        return {
          ...r,
          columns: r.columns.map((c, ci) => {
            if (ci !== toCol) return c;
            const blocks = [...c.blocks];
            const at = insertAt == null ? blocks.length : Math.min(insertAt, blocks.length);
            insertAt = at;
            blocks.splice(at, 0, block);
            return { ...c, blocks };
          }),
        };
      }),
    };
  });

  return { bands: next, blockIndex: insertAt ?? 0 };
}

function previewFrameClass(device: LayoutBreakpoint): string {
  if (device === 'mobile') return 'mx-auto w-full max-w-[390px]';
  if (device === 'tablet') return 'mx-auto w-full max-w-[820px]';
  return 'mx-auto w-full max-w-5xl';
}

export const PageBuilderWorkspace = component$<PageBuilderWorkspaceProps>((props) => {
  const bands = ensurePageLayoutBands(props.sections.value);
  const previewDevice = useSignal<LayoutBreakpoint>('desktop');
  const selection = useSignal<PageBuilderSelection>(null);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ blockId: string; key: string; accept?: string } | null>(null);
  const dragBlock = useSignal<BlockPath | null>(null);
  const dragWidgetType = useSignal<string | null>(null);
  const dropColumnKey = useSignal<string | null>(null);

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

  const clearDrag$ = $(() => {
    dragBlock.value = null;
    dragWidgetType.value = null;
    dropColumnKey.value = null;
  });

  return (
    <div class="flex h-full min-h-0 flex-col">
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
            <p class="text-[11px] text-gray-500 dark:text-gray-400">
              {translateApp(props.lang, 'pages.dragWidgetsHint')}
            </p>
            {insertable.map((entry) => (
              <button
                key={entry.type}
                type="button"
                draggable={true}
                class="w-full cursor-grab rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-start text-sm font-medium text-gray-800 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-950 active:cursor-grabbing dark:border-gray-700 dark:bg-slate-950 dark:text-gray-100 dark:hover:border-primary-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onDragStart$={(e) => {
                  dragWidgetType.value = entry.type;
                  dragBlock.value = null;
                  const dt = e.dataTransfer;
                  if (dt) {
                    dt.effectAllowed = 'copy';
                    dt.setData(WIDGET_DND, entry.type);
                    dt.setData('text/plain', entry.type);
                  }
                }}
                onDragEnd$={clearDrag$}
                onClick$={async () => {
                  const band = createBandWithBlock(props.registry.value, entry.type);
                  if (!band) return;
                  const next = [...bands, band];
                  await commit$(next);
                  selection.value = {
                    kind: 'block',
                    bandIndex: next.length - 1,
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

        {/* Canvas — sized to active device */}
        <main class="min-w-0 flex-1 overflow-y-auto bg-slate-200/40 p-4 sm:p-6 dark:bg-slate-950/40">
          <div
            class={[
              previewFrameClass(previewDevice.value),
              'min-h-[60vh] rounded-xl border border-gray-300 bg-slate-50/90 p-3 shadow-inner transition-[max-width] duration-300 dark:border-gray-700 dark:bg-slate-900/80',
            ].join(' ')}
          >
            <p class="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {translateApp(props.lang, `pages.device.${previewDevice.value}`)}{' '}
              {translateApp(props.lang, 'pages.previewFrame')}
            </p>

            {bands.length === 0 ? (
              <div
                class={[
                  'rounded-xl border border-dashed px-6 py-16 text-center',
                  dragWidgetType.value
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                    : 'border-gray-300 bg-white/70 dark:border-gray-700 dark:bg-slate-900/50',
                ].join(' ')}
                onDragOver$={(e) => {
                  if (dragWidgetType.value) e.preventDefault();
                }}
                onDrop$={async (e) => {
                  e.preventDefault();
                  const type =
                    dragWidgetType.value ||
                    e.dataTransfer?.getData(WIDGET_DND) ||
                    e.dataTransfer?.getData('text/plain');
                  await clearDrag$();
                  if (!type) return;
                  const band = createBandWithBlock(props.registry.value, type);
                  if (!band) return;
                  await commit$([band]);
                  selection.value = {
                    kind: 'block',
                    bandIndex: 0,
                    rowIndex: 0,
                    colIndex: 0,
                    blockIndex: 0,
                  };
                }}
              >
                <p class="text-sm font-medium">{translateApp(props.lang, 'pages.sectionsEmptyTitle')}</p>
                <p class="mt-1 text-xs text-gray-500">
                  {translateApp(props.lang, 'pages.dropOnCanvasHint')}
                </p>
              </div>
            ) : (
              <ul class="space-y-4">
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
                          class="ms-auto rounded border border-red-500 bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-500"
                          onClick$={async () => {
                            selection.value = null;
                            await commit$(
                              ensurePageLayoutBands(props.sections.value).filter(
                                (_, i) => i !== bandIndex,
                              ),
                            );
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
                          const stackBelow = row.stack_below || 'none';
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

                              {/* Exact device grid: 12 cols + effective span for active device */}
                              <div class="grid grid-cols-12 gap-2">
                                {row.columns.map((col, colIndex) => {
                                  const spans = normalizeColumnSpans(col.span);
                                  const effective = effectiveSpanForDevice(
                                    spans,
                                    stackBelow,
                                    previewDevice.value,
                                  );
                                  const colKey = `${bandIndex}-${rowIndex}-${colIndex}`;
                                  const isDropTarget = dropColumnKey.value === colKey;
                                  const colSelected =
                                    selection.value?.kind === 'column' &&
                                    selection.value.bandIndex === bandIndex &&
                                    selection.value.rowIndex === rowIndex &&
                                    selection.value.colIndex === colIndex;
                                  return (
                                    <div
                                      key={col.id}
                                      class={[
                                        previewColSpanClass(effective),
                                        'rounded-md border bg-gray-50 p-2 dark:bg-slate-950',
                                        isDropTarget
                                          ? 'border-primary-500 ring-2 ring-primary-500/40'
                                          : colSelected
                                            ? 'border-primary-500 ring-1 ring-primary-500/40'
                                            : 'border-gray-200 dark:border-gray-700',
                                      ].join(' ')}
                                      onDragOver$={(e) => {
                                        if (dragWidgetType.value || dragBlock.value) {
                                          e.preventDefault();
                                          dropColumnKey.value = colKey;
                                        }
                                      }}
                                      onDragLeave$={() => {
                                        if (dropColumnKey.value === colKey) {
                                          dropColumnKey.value = null;
                                        }
                                      }}
                                      onDrop$={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const widgetType =
                                          dragWidgetType.value ||
                                          e.dataTransfer?.getData(WIDGET_DND) ||
                                          e.dataTransfer?.getData('text/plain') ||
                                          null;
                                        const from = dragBlock.value;
                                        dropColumnKey.value = null;
                                        dragWidgetType.value = null;
                                        dragBlock.value = null;

                                        if (widgetType) {
                                          const inserted = insertWidgetIntoColumn(
                                            bands,
                                            props.registry.value,
                                            widgetType,
                                            bandIndex,
                                            rowIndex,
                                            colIndex,
                                          );
                                          if (!inserted) return;
                                          await commit$(inserted.bands);
                                          selection.value = {
                                            kind: 'block',
                                            bandIndex,
                                            rowIndex,
                                            colIndex,
                                            blockIndex: inserted.blockIndex,
                                          };
                                          return;
                                        }

                                        if (from) {
                                          const moved = moveBlockToColumn(
                                            bands,
                                            from,
                                            bandIndex,
                                            rowIndex,
                                            colIndex,
                                          );
                                          if (!moved) return;
                                          await commit$(moved.bands);
                                          selection.value = {
                                            kind: 'block',
                                            bandIndex,
                                            rowIndex,
                                            colIndex,
                                            blockIndex: moved.blockIndex,
                                          };
                                        }
                                      }}
                                    >
                                      <div class="mb-1 flex flex-wrap items-center gap-1">
                                        <button
                                          type="button"
                                          class="min-w-0 flex-1 truncate text-start text-[11px] font-medium text-gray-600 dark:text-gray-300"
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
                                          {effective}/12
                                        </button>
                                        <button
                                          type="button"
                                          class="inline-flex h-6 min-w-6 items-center justify-center rounded border border-gray-400 bg-white px-1.5 text-xs font-semibold text-gray-800 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-gray-500 dark:bg-slate-800 dark:text-white dark:hover:border-primary-400 dark:hover:bg-slate-700"
                                          title={translateApp(props.lang, 'pages.editColumn')}
                                          aria-label={translateApp(props.lang, 'pages.editColumn')}
                                          onClick$={(e) => {
                                            e.stopPropagation();
                                            selection.value = {
                                              kind: 'column',
                                              bandIndex,
                                              rowIndex,
                                              colIndex,
                                            };
                                          }}
                                        >
                                          ✎
                                        </button>
                                        <button
                                          type="button"
                                          class="inline-flex h-6 min-w-6 items-center justify-center rounded border border-red-500 bg-red-600 px-1.5 text-xs font-bold leading-none text-white hover:bg-red-500"
                                          title={translateApp(props.lang, 'pages.removeColumn')}
                                          aria-label={translateApp(props.lang, 'pages.removeColumn')}
                                          onClick$={async (e) => {
                                            e.stopPropagation();
                                            selection.value = null;
                                            const current = ensurePageLayoutBands(
                                              props.sections.value,
                                            );
                                            const next = current.map((b, bi) => {
                                              if (bi !== bandIndex) return b;
                                              return {
                                                ...b,
                                                rows: b.rows
                                                  .map((r, ri) => {
                                                    if (ri !== rowIndex) return r;
                                                    return {
                                                      ...r,
                                                      columns: r.columns.filter(
                                                        (_, ci) => ci !== colIndex,
                                                      ),
                                                    };
                                                  })
                                                  .filter((r) => r.columns.length > 0),
                                              };
                                            });
                                            await commit$(next);
                                          }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                      <ul class="min-h-[3rem] space-y-1">
                                        {col.blocks.length === 0 ? (
                                          <li class="rounded border border-dashed border-gray-300 px-2 py-3 text-center text-[11px] text-gray-400 dark:border-gray-600">
                                            {translateApp(props.lang, 'pages.dropWidgetHere')}
                                          </li>
                                        ) : null}
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
                                                'flex cursor-grab items-center gap-1 rounded border px-2 py-1.5 text-xs font-medium active:cursor-grabbing',
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
                                              onDragStart$={(e) => {
                                                dragWidgetType.value = null;
                                                dragBlock.value = {
                                                  bandIndex,
                                                  rowIndex,
                                                  colIndex,
                                                  blockIndex,
                                                };
                                                const dt = e.dataTransfer;
                                                if (dt) {
                                                  dt.effectAllowed = 'move';
                                                  dt.setData('text/plain', block.id);
                                                }
                                              }}
                                              onDragEnd$={clearDrag$}
                                              onDragOver$={(e) => e.preventDefault()}
                                              onDrop$={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const from = dragBlock.value;
                                                const widgetType = dragWidgetType.value;
                                                await clearDrag$();

                                                if (widgetType) {
                                                  const inserted = insertWidgetIntoColumn(
                                                    bands,
                                                    props.registry.value,
                                                    widgetType,
                                                    bandIndex,
                                                    rowIndex,
                                                    colIndex,
                                                  );
                                                  if (!inserted) return;
                                                  await commit$(inserted.bands);
                                                  selection.value = {
                                                    kind: 'block',
                                                    bandIndex,
                                                    rowIndex,
                                                    colIndex,
                                                    blockIndex: inserted.blockIndex,
                                                  };
                                                  return;
                                                }

                                                if (!from) return;
                                                const moved = moveBlockToColumn(
                                                  bands,
                                                  from,
                                                  bandIndex,
                                                  rowIndex,
                                                  colIndex,
                                                  blockIndex,
                                                );
                                                if (!moved) return;
                                                await commit$(moved.bands);
                                                selection.value = {
                                                  kind: 'block',
                                                  bandIndex,
                                                  rowIndex,
                                                  colIndex,
                                                  blockIndex: moved.blockIndex,
                                                };
                                              }}
                                            >
                                              <span class="min-w-0 flex-1 truncate">
                                                {appearanceSectionLabel(
                                                  props.lang,
                                                  block.type,
                                                  entry?.label || block.type,
                                                )}
                                              </span>
                                              <button
                                                type="button"
                                                class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-red-500 bg-red-600 px-1 text-[11px] font-bold leading-none text-white hover:bg-red-500"
                                                title={translateApp(props.lang, 'pages.removeWidget')}
                                                aria-label={translateApp(
                                                  props.lang,
                                                  'pages.removeWidget',
                                                )}
                                                onClick$={async (e) => {
                                                  e.stopPropagation();
                                                  const current = ensurePageLayoutBands(
                                                    props.sections.value,
                                                  );
                                                  const next = current.map((b, bi) => {
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
                                                  if (
                                                    selection.value?.kind === 'block' &&
                                                    selection.value.bandIndex === bandIndex &&
                                                    selection.value.rowIndex === rowIndex &&
                                                    selection.value.colIndex === colIndex &&
                                                    selection.value.blockIndex === blockIndex
                                                  ) {
                                                    selection.value = null;
                                                  }
                                                  await commit$(next);
                                                }}
                                              >
                                                ×
                                              </button>
                                            </li>
                                          );
                                        })}
                                      </ul>
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
          </div>
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
                <div>
                  <p class="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(props.lang, 'pages.spanPresets')} (
                    {translateApp(props.lang, `pages.device.${previewDevice.value}`)})
                  </p>
                  <div class="flex flex-wrap gap-1">
                    {([12, 8, 6, 4, 3] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        class="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:border-primary-400 hover:text-primary-700 dark:border-gray-600 dark:text-gray-200"
                        onClick$={async () => {
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
                                          [previewDevice.value]: preset,
                                        },
                                      };
                                    }),
                                  };
                                }),
                              };
                            }),
                          );
                        }}
                      >
                        {preset}/12
                      </button>
                    ))}
                  </div>
                </div>
                {(['mobile', 'tablet', 'desktop'] as LayoutBreakpoint[]).map((device) => (
                  <label
                    key={device}
                    class="block text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    {translateApp(props.lang, 'pages.span')} (
                    {translateApp(props.lang, `pages.device.${device}`)})
                    <input
                      type="number"
                      min={1}
                      max={12}
                      class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                      value={
                        normalizeColumnSpans(
                          bands[selection.value.bandIndex]?.rows[selection.value.rowIndex]
                            ?.columns[selection.value.colIndex]?.span,
                        )[device]
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
                                        [device]: Math.min(
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
                ))}
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
