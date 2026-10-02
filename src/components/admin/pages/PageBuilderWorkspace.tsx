import {
  component$,
  useComputed$,
  useContext,
  useOnDocument,
  useSignal,
  useTask$,
  useVisibleTask$,
  $,
  type QRL,
  type Signal,
} from '@builder.io/qwik';
import { showError, showInfo, showSuccess } from '~/lib/utils/toast';
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
  createInnerBand,
  ensurePageLayoutBands,
  findBlockInBands,
  normalizeColumnSpans,
  updateBlockInBands,
} from '~/lib/admin/page-layout';
import {
  effectiveSpanForDevice,
  previewColSpanClass,
  rowFlexStyle,
  columnContentLayout,
  rowGapClass,
} from '~/lib/marketing/page-layout-utils';
import { isHiddenOnDevice } from '~/lib/marketing/device-visibility';
import { isChromeKitType } from '~/lib/marketing/chrome-blocks';
import {
  isAppearanceFieldTranslatable,
  readAppearanceSettingValue,
  writeAppearanceSettingValue,
} from '~/lib/admin/appearance-locale-settings';
import { LayoutNodeShell } from '~/components/marketing/layout/LayoutNodeShell';
import {
  PageBuilderCanvasBlock,
  type BuilderPreviewContext,
} from '~/components/admin/pages/PageBuilderCanvasBlock';
import { PageBuilderViewMode } from '~/components/admin/pages/PageBuilderViewMode';
import { appearanceSectionLabel } from '~/lib/i18n/appearance-labels';
import { translateApp } from '~/lib/i18n/useTranslate';
import { followAdminTheme, type ThemeMode } from '~/lib/theme/theme-scope';
import { BuilderThemeToggle } from '~/components/admin/BuilderThemeToggle';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
} from '~/lib/admin/native-select-classes';
import { BuilderImportExportButtons } from '~/components/admin/BuilderImportExportButtons';
import { ColumnFlexFields } from '~/components/admin/pages/ColumnFlexFields';
import {
  BUILDER_TOOLBAR_ICON_BTN,
  BuilderToolbarIcon,
  builderToolbarToggleClass,
} from '~/components/admin/BuilderToolbarIcons';
import {
  BuilderInspectorTabs,
  BuilderResponsiveVisibilityFields,
} from '~/components/admin/BuilderResponsiveVisibilityFields';
import { BuilderStylePanel, STYLE_ACCORDION_GROUP, StyleModeSwitcher } from '~/components/admin/BuilderStylePanel';
import { InspectorAccordion } from '~/components/admin/InspectorAccordion';
import { BuilderBackgroundFields } from '~/components/admin/BuilderBackgroundFields';
import { BuilderKitStyle, useBuilderDesignKit } from '~/components/admin/builder-kit-context';
import { BuilderShapeDividerFields } from '~/components/admin/BuilderShapeDividerFields';
import {
  PageBuilderNavigator,
  navigatorPathToSelection,
} from '~/components/admin/pages/PageBuilderNavigator';
import {
  layoutTreeKindAt,
  layoutTreeNodeAt,
  moveLayoutTreeNode,
  type LayoutTreePath,
} from '~/lib/admin/page-layout-tree';
import {
  canPasteLayoutNode,
  canPasteLayoutNodeStyle,
  copyLayoutNodeStyle,
  duplicateLayoutNode,
  dropBlocksOverLimit,
  exceededBlockLimit,
  pasteLayoutNode,
  pasteLayoutNodeStyle,
  readNodeClipboard,
  readStyleClipboard,
  removeLayoutNode,
  resetLayoutNodeStyle,
  writeNodeClipboard,
  writeStyleClipboard,
  type BuilderNodeAction,
} from '~/lib/admin/page-builder-node-actions';
import { PageBuilderContextMenu } from '~/components/admin/pages/PageBuilderContextMenu';
import { useBuilderCanvasGuard } from '~/lib/admin/builder-canvas-guard';
import { useBuilderChromeMenus } from '~/lib/admin/builder-chrome-menus';
import { AdminSessionContext } from '~/stores/admin-session-context';
import { LayoutDeviceProvider } from '~/lib/marketing/layout-device-context';
import { normalizeHideOn, type DeviceHideOn } from '~/lib/marketing/device-visibility';
import type { BuilderStyles, StyleBreakpoint } from '~/lib/marketing/builder-styles';
import { CONTAINER_STYLE_TYPE } from '~/lib/marketing/builder-styles';
import { getApiClient } from '~/lib/api/client';
import {
  bandsWithBuilderMediaPreview,
  MEDIA_LOOKUP_CHUNK,
  missingBuilderMediaIds,
  withBuilderMediaPreview,
  type MediaUrlMap,
} from '~/lib/admin/builder-media-preview';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { PageBuilderDocument } from '~/lib/admin/builder-import-export';
import type {
  AppearanceRegistryEntry,
  LayoutBreakpoint,
  ColumnFlex,
  PageLayoutBand,
  PageLayoutBlock,
  PageLayoutColumn,
  PageLayoutRow,
  PageLayoutStackBelow,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';
import type { Media } from '~/types/media';
import type { CaseStudy, Testimonial, BlogPost } from '~/lib/marketing/types';
import type { PortfolioCategory } from '~/lib/marketing/content-layer';
import {
  listSavedBuilderBands,
  saveBuilderBand,
  type SavedBuilderBand,
} from '~/lib/admin/saved-builder-sections';
import type { BuilderDynamicTag } from '~/components/admin/appearance/BuilderDynamicTagChips';

const WIDGET_DND = 'application/x-credocode-widget';

export type PageBuilderSelection =
  | { kind: 'band'; bandIndex: number }
  | { kind: 'row'; bandIndex: number; rowIndex: number }
  | { kind: 'column'; bandIndex: number; rowIndex: number; colIndex: number }
  | { kind: 'block'; bandIndex: number; rowIndex: number; colIndex: number; blockIndex: number }
  | null;

/** Keeps the selection on the same node after a row is inserted at `rowIndex` of `bandIndex`. */
function shiftSelectionForRowInsert(
  sel: PageBuilderSelection,
  bandIndex: number,
  rowIndex: number,
): PageBuilderSelection {
  if (!sel || sel.kind === 'band' || sel.bandIndex !== bandIndex || sel.rowIndex < rowIndex) {
    return sel;
  }
  return { ...sel, rowIndex: sel.rowIndex + 1 };
}

/** Keeps the selection on the same node after a band is inserted at `bandIndex`. */
function shiftSelectionForBandInsert(sel: PageBuilderSelection, bandIndex: number): PageBuilderSelection {
  if (!sel || sel.bandIndex < bandIndex) {
    return sel;
  }
  return { ...sel, bandIndex: sel.bandIndex + 1 };
}

function groupRegistryByCategory(
  entries: AppearanceRegistryEntry[],
): Array<[string, AppearanceRegistryEntry[]]> {
  const grouped: Record<string, AppearanceRegistryEntry[]> = {};
  for (const entry of entries) {
    const cat = entry.category || 'General';
    const list = grouped[cat] || [];
    list.push(entry);
    grouped[cat] = list;
  }
  return Object.entries(grouped);
}

function blockAtSelection(
  bands: PageLayoutBand[],
  selection: PageBuilderSelection,
): PageLayoutBlock | null {
  if (!selection || selection.kind !== 'block') {
    return null;
  }
  const band = bands[selection.bandIndex];
  if (!band) {
    return null;
  }
  const row = band.rows[selection.rowIndex];
  if (!row) {
    return null;
  }
  const col = row.columns[selection.colIndex];
  if (!col) {
    return null;
  }
  return col.blocks[selection.blockIndex] || null;
}

export type PageBuilderWorkspaceProps = {
  lang: string;
  pageTitle: string;
  classicEditHref: string;
  /** Admin chrome trail, e.g. Pages → Page title → Builder */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  sections: Signal<PageSectionNode[]>;
  registry: Signal<AppearanceRegistryEntry[]>;
  siteLanguages: SiteLanguageRow[];
  defaultLocale: string;
  activeLocale: Signal<string>;
  /** Resolves `true` when the document was persisted (clears the unsaved-changes state). */
  onSave$: QRL<() => Promise<boolean>>;
  saving: Signal<boolean>;
  /** Live preview: page widgets vs header/footer chrome kits. */
  previewSurface?: 'page' | 'chrome';
  /** Import/export envelope kind (default page). */
  exportBuilderKind?:
    | 'page'
    | 'header'
    | 'footer'
    | 'body'
    | 'homepage'
    | 'single'
    | 'archive'
    | 'loop_item'
    | 'overlay';
  /** Site branding for chrome live preview (logos from settings). */
  previewBranding?: {
    name: string;
    logo?: string;
    logoDark?: string;
    logoLight?: string;
  };
  /** Live preview kit data (case studies tabs, testimonials, etc.). */
  previewSupport?: {
    caseStudies: CaseStudy[];
    portfolioCategories: PortfolioCategory[];
    testimonials: Testimonial[];
    blogPosts: BlogPost[];
    services?: import('~/lib/marketing/types').Service[];
    techStack?: string[];
  };
  /** Allowlisted dynamic tags for inspector chips. */
  dynamicTags?: BuilderDynamicTag[];
  /** Resolved tag preview (does not replace the editor document). */
  livePreviewOverride?: Signal<PageSectionNode[] | null>;
};

type BlockPath = {
  bandIndex: number;
  rowIndex: number;
  colIndex: number;
  blockIndex: number;
};

type RowPath = { bandIndex: number; rowIndex: number };

type ColPath = { bandIndex: number; rowIndex: number; colIndex: number };

function rowPathOf(selection: PageBuilderSelection): RowPath | null {
  if (!selection || selection.kind !== 'row') {
    return null;
  }
  return { bandIndex: selection.bandIndex, rowIndex: selection.rowIndex };
}

function rowAtSelection(
  bands: PageLayoutBand[],
  selection: PageBuilderSelection,
): PageLayoutRow | null {
  const path = rowPathOf(selection);
  if (!path) {
    return null;
  }
  const band = bands[path.bandIndex];
  if (!band) {
    return null;
  }
  return band.rows[path.rowIndex] || null;
}

function colPathOf(selection: PageBuilderSelection): ColPath | null {
  if (!selection || selection.kind !== 'column') {
    return null;
  }
  return {
    bandIndex: selection.bandIndex,
    rowIndex: selection.rowIndex,
    colIndex: selection.colIndex,
  };
}

function colAtSelection(
  bands: PageLayoutBand[],
  selection: PageBuilderSelection,
): PageLayoutColumn | null {
  const path = colPathOf(selection);
  if (!path) {
    return null;
  }
  const row = rowAtSelection(bands, {
    kind: 'row',
    bandIndex: path.bandIndex,
    rowIndex: path.rowIndex,
  });
  if (!row) {
    return null;
  }
  return row.columns[path.colIndex] || null;
}

type MediaPickerTarget = { blockId: string; key: string; accept?: string };

type GlobalWidgetApiRow = { id: number; name: string; status?: string };

type PaletteTab = 'widgets' | 'kits' | 'globals';

type InspectorTab = 'content' | 'style' | 'advanced';

type GlobalWidgetCreated = { id?: number };

type BandLayoutWidth = 'boxed' | 'full';

type RowJustify = 'start' | 'center' | 'end' | 'between';
type RowAlign = 'start' | 'center' | 'end' | 'stretch';

const ROW_ALIGN_OPTIONS: Array<{ value: RowAlign; labelKey: string }> = [
  { value: 'stretch', labelKey: 'pages.rowAlignStretch' },
  { value: 'start', labelKey: 'pages.rowAlignTop' },
  { value: 'center', labelKey: 'pages.rowAlignMiddle' },
  { value: 'end', labelKey: 'pages.rowAlignBottom' },
];

/** Module-level so `$` handlers do not capture non-serializable closures. */
function usedSpanInRow(
  row: {
    columns: Array<{ span: unknown }>;
    stack_below?: PageLayoutStackBelow;
  },
  device: LayoutBreakpoint,
): number {
  const stackBelow = row.stack_below || 'none';
  return row.columns.reduce(
    (sum, col) =>
      sum + effectiveSpanForDevice(normalizeColumnSpans(col.span), stackBelow, device),
    0,
  );
}

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
    kind: entry.kind || 'kit',
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

/** Create a column in the free span of a row and place a new widget inside. */
function insertWidgetIntoRemaining(
  bands: PageLayoutBand[],
  registry: AppearanceRegistryEntry[],
  type: string,
  bandIndex: number,
  rowIndex: number,
  device: LayoutBreakpoint,
): { bands: PageLayoutBand[]; colIndex: number; blockIndex: number } | null {
  if (!canInsertBlockType(bands, registry, type)) return null;
  const entry = registry.find((r) => r.type === type);
  if (!entry) return null;
  const row = bands[bandIndex]?.rows[rowIndex];
  if (!row) return null;
  const remaining = Math.max(0, 12 - usedSpanInRow(row, device));
  if (remaining <= 0) {
    const lastCol = Math.max(0, row.columns.length - 1);
    const inserted = insertWidgetIntoColumn(
      bands,
      registry,
      type,
      bandIndex,
      rowIndex,
      lastCol,
    );
    if (!inserted) return null;
    return { bands: inserted.bands, colIndex: lastCol, blockIndex: inserted.blockIndex };
  }
  const span = remaining;
  const block: PageLayoutBlock = {
    id: newBlockId(type),
    kind: entry.kind || 'kit',
    type,
    enabled: true,
    settings: { ...(entry.default_settings ?? {}) },
  };
  const col = createEmptyColumn(span);
  col.blocks = [block];
  const next = bands.map((b, bi) => {
    if (bi !== bandIndex) return b;
    return {
      ...b,
      rows: b.rows.map((r, ri) => {
        if (ri !== rowIndex) return r;
        return { ...r, columns: [...r.columns, col] };
      }),
    };
  });
  const colIndex = (next[bandIndex]?.rows[rowIndex]?.columns.length ?? 1) - 1;
  return { bands: next, colIndex: Math.max(0, colIndex), blockIndex: 0 };
}

/** Move an existing block into a new column that fills the row's free span. */
function moveBlockIntoRemaining(
  bands: PageLayoutBand[],
  from: BlockPath,
  bandIndex: number,
  rowIndex: number,
  device: LayoutBreakpoint,
): { bands: PageLayoutBand[]; colIndex: number; blockIndex: number } | null {
  const sourceCol = bands[from.bandIndex]?.rows[from.rowIndex]?.columns[from.colIndex];
  const block = sourceCol?.blocks[from.blockIndex];
  if (!block) return null;
  const row = bands[bandIndex]?.rows[rowIndex];
  if (!row) return null;
  const remaining = Math.max(0, 12 - usedSpanInRow(row, device));
  if (remaining <= 0) {
    const lastCol = Math.max(0, row.columns.length - 1);
    const moved = moveBlockToColumn(bands, from, bandIndex, rowIndex, lastCol);
    if (!moved) return null;
    return { bands: moved.bands, colIndex: lastCol, blockIndex: moved.blockIndex };
  }

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

  const col = createEmptyColumn(remaining);
  col.blocks = [block];
  const next = stripped.map((b, bi) => {
    if (bi !== bandIndex) return b;
    return {
      ...b,
      rows: b.rows.map((r, ri) => {
        if (ri !== rowIndex) return r;
        return { ...r, columns: [...r.columns, col] };
      }),
    };
  });
  const colIndex = (next[bandIndex]?.rows[rowIndex]?.columns.length ?? 1) - 1;
  return { bands: next, colIndex: Math.max(0, colIndex), blockIndex: 0 };
}

function findRowWithRemaining(
  bands: PageLayoutBand[],
  device: LayoutBreakpoint,
  prefer: RowPath | null,
): RowPath | null {
  if (prefer) {
    const row = bands[prefer.bandIndex]?.rows[prefer.rowIndex];
    if (row && 12 - usedSpanInRow(row, device) > 0) return prefer;
  }
  for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
    const rows = bands[bandIndex]?.rows ?? [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (12 - usedSpanInRow(rows[rowIndex], device) > 0) {
        return { bandIndex, rowIndex };
      }
    }
  }
  return null;
}

function previewFrameClass(device: LayoutBreakpoint): string {
  if (device === 'mobile') return 'mx-auto w-full max-w-[390px]';
  if (device === 'tablet') return 'mx-auto w-full max-w-[820px]';
  return 'mx-auto w-full min-w-[1024px]';
}

/** True when the click belongs to this canvas node, not a nested band/row/column/block. */
/** Remounts inspector panels per selected node; child settings panels do not pick up new field lists otherwise. */
function inspectorKey(selection: unknown, nodeId = ''): string {
  return `${JSON.stringify(selection)}|${nodeId}`;
}

function selectionToTreePath(sel: PageBuilderSelection): LayoutTreePath | null {
  if (!sel) return null;
  if (sel.kind === 'band') return [sel.bandIndex];
  if (sel.kind === 'row') return [sel.bandIndex, sel.rowIndex];
  if (sel.kind === 'column') return [sel.bandIndex, sel.rowIndex, sel.colIndex];
  return [sel.bandIndex, sel.rowIndex, sel.colIndex, sel.blockIndex];
}

/** Context-menu title: "Row 2" for containers, the widget/kit label for blocks. */
function builderNodeLabel(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
  registry: AppearanceRegistryEntry[],
  lang: string,
): string {
  const kind = layoutTreeKindAt(path.length);
  if (kind !== 'block') {
    const key = kind === 'band' ? 'pages.band' : kind === 'row' ? 'pages.row' : 'pages.column';
    return `${translateApp(lang, key)} ${path[path.length - 1] + 1}`;
  }
  const block = layoutTreeNodeAt(bands, path) as PageLayoutBlock | null;
  const type = String(block?.type ?? '');
  const entry = registry.find((r) => r.type === type);
  return appearanceSectionLabel(lang, type, entry?.label || type);
}

/** Shortcuts stay with the browser while typing in a field or selecting text. */
function isEditingText(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
  const selected = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
  return !!selected;
}

function isOwnBuilderNodeClick(e: Event, el: Element): boolean {
  const target = e.target as Element | null;
  return !!target && target.closest('[data-builder-node]') === el;
}

/** Non-layout outline overlay for a canvas node (selected / drop target / hover). */
function builderOutlineClass(selected: boolean, dropTarget: boolean, hoverClass: string): string {
  return [
    'pointer-events-none absolute inset-0 z-30 outline -outline-offset-1',
    selected || dropTarget
      ? 'outline-2 outline-primary-500'
      : `outline-1 outline-dashed outline-transparent ${hoverClass}`,
    dropTarget ? 'bg-primary-500/10' : '',
  ].join(' ');
}

/** Nodes hidden for the active device stay editable but dimmed (public render omits them). */
function hiddenOnDeviceClass(node: { hide_on?: unknown }, device: LayoutBreakpoint): string {
  return isHiddenOnDevice(node.hide_on, device) ? 'opacity-40' : '';
}

export const PageBuilderWorkspace = component$<PageBuilderWorkspaceProps>((props) => {
  const bands = ensurePageLayoutBands(props.sections.value);
  useBuilderCanvasGuard();
  const adminSession = useContext(AdminSessionContext, null);
  const chromeMenus = useBuilderChromeMenus(
    props.sections,
    props.activeLocale,
    props.previewSurface === 'chrome',
  );
  const previewDevice = useSignal<LayoutBreakpoint>('desktop');
  const selection = useSignal<PageBuilderSelection>(null);
  const mediaPreviewById = useSignal<MediaUrlMap>({});
  /** Ids already requested from the lookup (found or not), so edits don't refetch them. */
  const mediaLookedUp = useSignal<number[]>([]);
  const mediaTarget = useSignal<MediaPickerTarget | null>(null);
  const dragBlock = useSignal<BlockPath | null>(null);
  const dragWidgetType = useSignal<string | null>(null);
  const dropColumnKey = useSignal<string | null>(null);
  const dropRowKey = useSignal<string | null>(null);
  const paletteTab = useSignal<PaletteTab>('widgets');
  const paletteSearch = useSignal('');
  const undoStack = useSignal<string[]>([]);
  const redoStack = useSignal<string[]>([]);
  const globalsList = useSignal<GlobalWidgetApiRow[]>([]);
  const savedBands = useSignal<SavedBuilderBand[]>([]);
  const viewMode = useSignal(false);
  const showNavigator = useSignal(false);
  const inspectorTab = useSignal<InspectorTab>('content');
  /** Back keeps the selection so palette inserts still target the selected column. */
  const sidebarView = useSignal<'palette' | 'controls'>('palette');
  /** Set when only the selection's indices shift (same node), so the sidebar view and tab stay put. */
  const selectionReindexed = useSignal(false);
  const previewTheme = useSignal<ThemeMode>('light');
  const designKit = useBuilderDesignKit();
  /** Once the editor picks a canvas theme, stop mirroring the admin theme. */
  const previewThemePinned = useSignal(false);

  useTask$(({ track }) => {
    track(() => selection.value);
    if (selectionReindexed.value) {
      selectionReindexed.value = false;
      return;
    }
    inspectorTab.value = 'content';
    sidebarView.value = selection.value ? 'controls' : 'palette';
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const res = await getApiClient(null).get(API_ENDPOINTS.APPEARANCE.GLOBALS);
      const rows = Array.isArray(res.data) ? (res.data as GlobalWidgetApiRow[]) : [];
      globalsList.value = rows
        .filter((r) => r.status !== 'draft')
        .map((r) => ({ id: Number(r.id), name: String(r.name || r.id) }));
    } catch {
      globalsList.value = [];
    }
    savedBands.value = listSavedBuilderBands();
  });

  // Library images are stored by id; fetch their URLs (one request per 200 ids) so the canvas
  // renders them like the public page. Re-runs on edits, but only for ids not requested yet.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const sections = track(() => props.sections.value);
    // The registry loads after mount; field types are needed to find media ids.
    const registry = track(() => props.registry.value);
    const tried = new Set(mediaLookedUp.value);
    const ids = missingBuilderMediaIds(
      ensurePageLayoutBands(sections),
      registry,
      mediaPreviewById.value,
    ).filter((id) => !tried.has(id));
    if (ids.length === 0) return;
    mediaLookedUp.value = [...mediaLookedUp.value, ...ids];
    const found: MediaUrlMap = {};
    for (let i = 0; i < ids.length; i += MEDIA_LOOKUP_CHUNK) {
      const chunk = ids.slice(i, i + MEDIA_LOOKUP_CHUNK);
      try {
        type LookupRow = { id: number; url: string };
        const res = await getApiClient(null).get<LookupRow[] | { data?: LookupRow[] }>(
          `${API_ENDPOINTS.MEDIA.LOOKUP}?ids=${chunk.join(',')}`,
        );
        const body = res.data;
        const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        for (const row of rows) {
          if (row?.id && row.url) found[String(row.id)] = row.url;
        }
      } catch (err) {
        console.error('Builder media lookup failed', err);
      }
    }
    if (Object.keys(found).length > 0) {
      mediaPreviewById.value = { ...mediaPreviewById.value, ...found };
    }
  });

  // Saving is manual only; this snapshot drives the unsaved-changes badge and leave warning.
  const savedSnapshot = useSignal(JSON.stringify(props.sections.value));
  const hasUnsavedChanges = useComputed$(
    () => JSON.stringify(props.sections.value) !== savedSnapshot.value,
  );

  const save$ = $(async () => {
    try {
      if (await props.onSave$()) {
        savedSnapshot.value = JSON.stringify(props.sections.value);
      }
    } catch (err) {
      console.error('Builder save failed', err);
      showError(translateApp(props.lang, 'common.error'));
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    if (!track(() => hasUnsavedChanges.value)) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    cleanup(() => window.removeEventListener('beforeunload', warn));
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    cleanup(followAdminTheme(previewTheme, previewThemePinned));
  });

  const setPreviewTheme$ = $((mode: ThemeMode) => {
    previewThemePinned.value = true;
    previewTheme.value = mode;
  });

  const clearDrag$ = $(() => {
    dragBlock.value = null;
    dragWidgetType.value = null;
    dropColumnKey.value = null;
    dropRowKey.value = null;
  });

  const commit$ = $(async (next: PageLayoutBand[]) => {
    const prev = JSON.stringify(props.sections.value);
    undoStack.value = [...undoStack.value.slice(-29), prev];
    redoStack.value = [];
    props.sections.value = next;
  });

  const contextMenu = useSignal<{ x: number; y: number; path: LayoutTreePath; fromNavigator: boolean } | null>(null);

  /** Commits unless the change would exceed a kit's max instances (e.g. a second hero). */
  const commitWithinLimits$ = $(async (next: PageLayoutBand[]): Promise<boolean> => {
    const over = exceededBlockLimit(next, props.registry.value);
    if (over) {
      showError(`${translateApp(props.lang, 'pages.ctxLimitReached')}: ${over}`);
      return false;
    }
    await commit$(next);
    return true;
  });

  const commitInserted$ = $(async (bands: PageLayoutBand[], path: LayoutTreePath) => {
    const trimmed = dropBlocksOverLimit(bands, path, props.registry.value);
    if (!(await commitWithinLimits$(trimmed.bands))) return;
    selection.value = navigatorPathToSelection(path);
    if (trimmed.skipped.length) {
      showInfo(`${translateApp(props.lang, 'pages.ctxSkippedLimited')}: ${trimmed.skipped.join(', ')}`);
    }
  });

  const runNodeAction$ = $(async (action: BuilderNodeAction, path: LayoutTreePath) => {
    const current = ensurePageLayoutBands(props.sections.value);
    if (!layoutTreeNodeAt(current, path)) return;
    switch (action) {
      case 'edit':
        selection.value = navigatorPathToSelection(path);
        return;
      case 'navigator':
        selection.value = navigatorPathToSelection(path);
        showNavigator.value = true;
        return;
      case 'duplicate': {
        const res = duplicateLayoutNode(current, path);
        if (res) await commitInserted$(res.bands, res.path);
        return;
      }
      case 'copy': {
        const node = layoutTreeNodeAt(current, path);
        if (!node) return;
        writeNodeClipboard({ kind: layoutTreeKindAt(path.length), node });
        showSuccess(translateApp(props.lang, 'pages.ctxCopied'));
        return;
      }
      case 'paste': {
        const clip = readNodeClipboard();
        const res = clip ? pasteLayoutNode(current, path, clip) : null;
        if (!res) {
          showError(translateApp(props.lang, 'pages.ctxCannotPaste'));
          return;
        }
        await commitInserted$(res.bands, res.path);
        return;
      }
      case 'copy_style': {
        const clip = copyLayoutNodeStyle(current, path);
        if (!clip) return;
        writeStyleClipboard(clip);
        showSuccess(translateApp(props.lang, 'pages.ctxStyleCopied'));
        return;
      }
      case 'paste_style': {
        const clip = readStyleClipboard();
        if (!clip || !canPasteLayoutNodeStyle(current, path, clip)) {
          showError(translateApp(props.lang, 'pages.ctxCannotPasteStyle'));
          return;
        }
        await commit$(pasteLayoutNodeStyle(current, path, clip));
        return;
      }
      case 'reset_style':
        await commit$(resetLayoutNodeStyle(current, path));
        return;
      case 'delete':
        selection.value = null;
        await commit$(removeLayoutNode(current, path));
        return;
    }
  });

  const openContextMenu$ = $((e: MouseEvent, path: LayoutTreePath, fromNavigator = false) => {
    contextMenu.value = { x: e.clientX, y: e.clientY, path, fromNavigator };
    if (!fromNavigator) selection.value = navigatorPathToSelection(path);
  });

  useOnDocument(
    'keydown',
    $(async (e: Event) => {
      const ev = e as KeyboardEvent;
      if (viewMode.value || contextMenu.value || isEditingText(ev)) return;
      const path = selectionToTreePath(selection.value);
      if (!path) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const key = ev.key.toLowerCase();
      let action: BuilderNodeAction | null = null;
      if (mod && key === 'd') action = 'duplicate';
      else if (mod && key === 'c') action = 'copy';
      else if (mod && key === 'v') action = 'paste';
      else if (!mod && ev.key === 'Delete') action = 'delete';
      if (!action) return;
      ev.preventDefault();
      await runNodeAction$(action, path);
    }),
  );

  const searchQ = paletteSearch.value.trim().toLowerCase();
  const insertable = props.registry.value
    .filter((entry) => {
      const kind = entry.kind || 'kit';
      if (paletteTab.value === 'widgets' && kind !== 'widget') return false;
      if (paletteTab.value === 'kits' && kind !== 'kit') return false;
      if (paletteTab.value === 'globals') return false;
      // Header/footer kits render nothing on a page; blocks already placed keep their registry entry.
      if (props.previewSurface !== 'chrome' && isChromeKitType(entry.type)) return false;
      if (searchQ) {
        const hay = `${entry.label} ${entry.type} ${entry.category || ''}`.toLowerCase();
        if (!hay.includes(searchQ)) return false;
      }
      return canInsertBlockType(bands, props.registry.value, entry.type, entry.kind);
    })
    .slice();

  const insertableByCategory = groupRegistryByCategory(insertable);
  const selectedBlock = blockAtSelection(bands, selection.value);
  // Inspector props read these locals: `selectedBlock.x` in JSX is frozen by the optimizer, so each
  // edit would start from the values the block had when it was selected.
  const selectedBlockSettings = selectedBlock?.settings;
  const selectedBlockStyles = selectedBlock?.styles;
  const selectedBlockHideOn = selectedBlock?.hide_on;
  const selectedRow = rowAtSelection(bands, selection.value);
  const selectedCol = colAtSelection(bands, selection.value);
  const previewCtx: BuilderPreviewContext = {
    surface: props.previewSurface ?? 'page',
    uiLocale: props.activeLocale.value || props.defaultLocale,
    pageTitle: props.pageTitle || 'Preview',
    siteLanguages: props.siteLanguages || [],
    branding: props.previewBranding,
    support: props.previewSupport,
    isDarkMode: previewTheme.value === 'dark',
    session: adminSession?.value?.user ? { user: adminSession.value.user } : null,
    menus: chromeMenus.value,
  };
  const resolvedBands =
    props.livePreviewOverride?.value && props.livePreviewOverride.value.length > 0
      ? ensurePageLayoutBands(props.livePreviewOverride.value)
      : null;

  return (
    <div class="flex h-full min-h-0 flex-col">
      <BuilderKitStyle css={designKit.css} />
      <header class="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-slate-900">
        <Link
          href={props.classicEditHref}
          class={BUILDER_TOOLBAR_ICON_BTN}
          aria-label={translateApp(props.lang, 'pages.exitBuilder')}
          title={translateApp(props.lang, 'pages.exitBuilder')}
        >
          <BuilderToolbarIcon name="exit" />
        </Link>
        <div class="min-w-0 flex-1">
          {props.breadcrumbs && props.breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" class="mb-0.5">
              <ol class="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                {props.breadcrumbs.map((c, i) => (
                  <li key={i} class="flex min-w-0 items-center gap-1">
                    {i > 0 ? <span aria-hidden="true">/</span> : null}
                    {c.href && i + 1 !== props.breadcrumbs!.length ? (
                      <Link href={c.href} class="truncate hover:text-primary-600 dark:hover:text-primary-400">
                        {c.label}
                      </Link>
                    ) : (
                      <span
                        class={[
                          'truncate',
                          i === props.breadcrumbs!.length - 1
                            ? 'font-medium text-gray-800 dark:text-gray-100'
                            : '',
                        ].join(' ')}
                        aria-current={i === props.breadcrumbs!.length - 1 ? 'page' : undefined}
                      >
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(props.lang, 'pages.builderTitle')}
            {props.pageTitle ? ` — ${props.pageTitle}` : ''}
          </p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
            {translateApp(props.lang, 'pages.builderHint')}
          </p>
        </div>
        {/* Preview device switch */}
        <div
          class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600"
          role="group"
          aria-label={translateApp(props.lang, 'pages.previewDevice')}
        >
          {(['mobile', 'tablet', 'desktop'] as LayoutBreakpoint[]).map((device) => (
            <button
              key={device}
              type="button"
              aria-pressed={previewDevice.value === device ? 'true' : 'false'}
              aria-label={translateApp(props.lang, `pages.device.${device}`)}
              title={translateApp(props.lang, `pages.device.${device}`)}
              class={[
                'inline-flex h-8 w-8 items-center justify-center rounded-md',
                previewDevice.value === device
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
              onClick$={() => {
                previewDevice.value = device;
              }}
            >
              <BuilderToolbarIcon name={device} />
            </button>
          ))}
        </div>
        {/* Canvas preview theme switch */}
        <BuilderThemeToggle
          lang={props.lang}
          mode={previewTheme.value}
          onChange$={setPreviewTheme$}
        />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={translateApp(props.lang, 'pages.viewPage')}
          title={translateApp(props.lang, 'pages.viewPage')}
          class={builderToolbarToggleClass(viewMode.value)}
          onClick$={() => {
            showNavigator.value = false;
            viewMode.value = true;
          }}
        >
          <BuilderToolbarIcon name="preview" />
        </button>
        {/* Navigator modal toggle */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-pressed={showNavigator.value ? 'true' : 'false'}
          aria-label={translateApp(props.lang, 'pages.navigatorOpen')}
          title={translateApp(props.lang, 'pages.navigatorOpen')}
          class={builderToolbarToggleClass(showNavigator.value)}
          onClick$={() => {
            showNavigator.value = !showNavigator.value;
          }}
        >
          <BuilderToolbarIcon name="navigator" />
        </button>
        <button
          type="button"
          class={BUILDER_TOOLBAR_ICON_BTN}
          aria-label={translateApp(props.lang, 'pages.undo')}
          title={translateApp(props.lang, 'pages.undo')}
          disabled={undoStack.value.length === 0}
          onClick$={() => {
            const prev = undoStack.value[undoStack.value.length - 1];
            if (!prev) return;
            redoStack.value = [...redoStack.value, JSON.stringify(props.sections.value)];
            undoStack.value = undoStack.value.slice(0, -1);
            props.sections.value = JSON.parse(prev);
            selection.value = null;
          }}
        >
          <BuilderToolbarIcon name="undo" />
        </button>
        <button
          type="button"
          class={BUILDER_TOOLBAR_ICON_BTN}
          aria-label={translateApp(props.lang, 'pages.redo')}
          title={translateApp(props.lang, 'pages.redo')}
          disabled={redoStack.value.length === 0}
          onClick$={() => {
            const next = redoStack.value[redoStack.value.length - 1];
            if (!next) return;
            undoStack.value = [...undoStack.value, JSON.stringify(props.sections.value)];
            redoStack.value = redoStack.value.slice(0, -1);
            props.sections.value = JSON.parse(next);
            selection.value = null;
          }}
        >
          <BuilderToolbarIcon name="redo" />
        </button>
        <BuilderImportExportButtons
          lang={props.lang}
          iconOnly
          builder={props.exportBuilderKind || 'page'}
          filenameBase={props.pageTitle || 'page'}
          disabled={props.saving.value}
          getDocument$={$(() => ({ sections: props.sections.value }))}
          applyDocument$={$((document) => {
            const doc = document as PageBuilderDocument;
            props.sections.value = ensurePageLayoutBands(doc.sections);
            selection.value = null;
          })}
        />
        {/* Manual save; amber dot marks unsaved changes */}
        <button
          type="button"
          class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={props.saving.value}
          aria-busy={props.saving.value ? 'true' : 'false'}
          aria-label={translateApp(
            props.lang,
            props.saving.value ? 'common.loading' : hasUnsavedChanges.value ? 'pages.saveUnsaved' : 'common.save',
          )}
          title={translateApp(
            props.lang,
            props.saving.value ? 'common.loading' : hasUnsavedChanges.value ? 'pages.saveUnsaved' : 'common.save',
          )}
          onClick$={save$}
        >
          <BuilderToolbarIcon name={props.saving.value ? 'spinner' : 'save'} />
          {hasUnsavedChanges.value && !props.saving.value ? (
            <span
              class="absolute -end-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 dark:border-slate-900"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </header>

      <div class="flex min-h-0 flex-1">
        {/* Single sidebar: widgets palette, or the selected node's controls */}
        {sidebarView.value === 'controls' && selection.value ? (
          <>
          {/* Inspector */}
          <aside class="flex w-80 flex-shrink-0 flex-col border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
            <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                onClick$={() => {
                  sidebarView.value = 'palette';
                }}
              >
                {/* Chevron flips in RTL */}
                <svg class="h-4 w-4 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                {translateApp(props.lang, 'pages.backToWidgets')}
              </button>
              <span class="ms-auto text-xs font-semibold uppercase tracking-wide text-gray-500">
                {translateApp(props.lang, 'pages.inspector')}
              </span>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto p-3">

              {selection.value ? (
                <BuilderInspectorTabs
                  lang={props.lang}
                  tab={inspectorTab.value}
                  showStyle={Boolean(selection.value)}
                  onTab$={$((tab) => {
                    inspectorTab.value = tab;
                  })}
                />
              ) : null}

              {selection.value?.kind === 'band' ? (
                <div key={inspectorKey(selection.value)} class="space-y-3">
                  <p class="text-sm font-medium">
                    {translateApp(props.lang, 'pages.band')} #{selection.value.bandIndex + 1}
                  </p>
                  <button
                    type="button"
                    class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                    onClick$={() => {
                      const band = bands[selection.value!.bandIndex];
                      if (!band) return;
                      const name = window.prompt(translateApp(props.lang, 'pages.saveSection'), translateApp(props.lang, 'pages.band'));
                      if (!name) return;
                      savedBands.value = saveBuilderBand(name, band);
                    }}
                  >
                    {translateApp(props.lang, 'pages.saveSection')}
                  </button>
                  {inspectorTab.value === 'content' ? (
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(props.lang, 'appearance.layoutWidth')}
                    <select
                      class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                      value={bands[selection.value.bandIndex]?.layout_width || 'boxed'}
                      onChange$={async (e) => {
                        const layout_width = (e.target as HTMLSelectElement).value as BandLayoutWidth;
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
                  ) : null}
                  {inspectorTab.value === 'style' ? (
                    <div class="space-y-4">
                      <StyleModeSwitcher lang={props.lang} mode={previewTheme.value} onMode$={setPreviewTheme$} />
                      <InspectorAccordion title={translateApp(props.lang, 'builder.background.title')} group={STYLE_ACCORDION_GROUP} open>
                        <BuilderBackgroundFields
                          mode={previewTheme.value}
                          lang={props.lang}
                          settings={bands[selection.value.bandIndex]?.settings}
                          onChange$={$(async (next) => {
                            const bi = selection.value!.bandIndex;
                            await commit$(
                              bands.map((b, i) => (i === bi ? { ...b, settings: next } : b)),
                            );
                          })}
                        />
                      </InspectorAccordion>
                      <InspectorAccordion title={translateApp(props.lang, 'builder.shapeDividers')} group={STYLE_ACCORDION_GROUP}>
                        <BuilderShapeDividerFields
                          lang={props.lang}
                          settings={bands[selection.value.bandIndex]?.settings}
                          onChange$={$(async (next) => {
                            const bi = selection.value!.bandIndex;
                            await commit$(
                              bands.map((b, i) => (i === bi ? { ...b, settings: next } : b)),
                            );
                          })}
                        />
                      </InspectorAccordion>
                      <BuilderStylePanel
                        openFirst={false}
                        showModeSwitcher={false}
                        mode={previewTheme.value}
                        onMode$={setPreviewTheme$}
                        lang={props.lang}
                        widgetType={CONTAINER_STYLE_TYPE}
                        styles={bands[selection.value.bandIndex]?.styles}
                        device={previewDevice.value as StyleBreakpoint}
                        onDevice$={$((device: StyleBreakpoint) => {
                          previewDevice.value = device;
                        })}
                        onChange$={$(async (next: BuilderStyles) => {
                          const bi = selection.value!.bandIndex;
                          await commit$(
                            bands.map((b, i) => (i === bi ? { ...b, styles: next } : b)),
                          );
                        })}
                      />
                    </div>
                  ) : null}
                  {inspectorTab.value === 'advanced' ? (
                    <div class="space-y-3">
                      <label class="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={bands[selection.value.bandIndex]?.settings?.sticky === true}
                          onChange$={async (e) => {
                            const bi = selection.value!.bandIndex;
                            const checked = (e.target as HTMLInputElement).checked;
                            await commit$(
                              bands.map((b, i) =>
                                i === bi
                                  ? {
                                      ...b,
                                      settings: { ...(b.settings || {}), sticky: checked },
                                    }
                                  : b,
                              ),
                            );
                          }}
                        />
                        {translateApp(props.lang, 'pages.sticky')}
                      </label>
                      <BuilderResponsiveVisibilityFields
                      lang={props.lang}
                      hideOn={bands[selection.value.bandIndex]?.hide_on}
                      onChange$={$(async (next: DeviceHideOn) => {
                        const bi = selection.value!.bandIndex;
                        await commit$(
                          bands.map((b, i) =>
                            i === bi ? { ...b, hide_on: normalizeHideOn(next) } : b,
                          ),
                        );
                      })}
                    />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selection.value?.kind === 'row' ? (
                <div key={inspectorKey(selection.value)} class="space-y-3">
                  <p class="text-sm font-medium">
                    {translateApp(props.lang, 'pages.row')} {selection.value.rowIndex + 1}
                  </p>
                  {inspectorTab.value === 'content' ? (
                  <>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(props.lang, 'pages.stackBelow')}
                    <select
                      class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                      value={selectedRow?.stack_below || 'none'}
                      onChange$={async (e) => {
                        const stack_below = (e.target as HTMLSelectElement)
                          .value as PageLayoutStackBelow;
                        const path = rowPathOf(selection.value);
                        if (!path) return;
                        const { bandIndex, rowIndex } = path;
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
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(props.lang, 'pages.rowJustify')}
                    <select
                      class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                      value={selectedRow?.justify || 'start'}
                      onChange$={async (e) => {
                        const nextJustify = (e.target as HTMLSelectElement)
                          .value as RowJustify;
                        const path = rowPathOf(selection.value);
                        if (!path) return;
                        await commit$(
                          bands.map((b, bi) => {
                            if (bi !== path.bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) =>
                                ri === path.rowIndex ? { ...r, justify: nextJustify } : r,
                              ),
                            };
                          }),
                        );
                      }}
                    >
                      <option class={ADMIN_NATIVE_OPTION_CLASS} value="start">
                        start
                      </option>
                      <option class={ADMIN_NATIVE_OPTION_CLASS} value="center">
                        center
                      </option>
                      <option class={ADMIN_NATIVE_OPTION_CLASS} value="end">
                        end
                      </option>
                      <option class={ADMIN_NATIVE_OPTION_CLASS} value="between">
                        between
                      </option>
                    </select>
                  </label>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(props.lang, 'pages.rowAlign')}
                    <select
                      class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                      value={selectedRow?.align || 'stretch'}
                      onChange$={async (e) => {
                        const nextAlign = (e.target as HTMLSelectElement).value as RowAlign;
                        const path = rowPathOf(selection.value);
                        if (!path) return;
                        await commit$(
                          bands.map((b, bi) => {
                            if (bi !== path.bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) =>
                                ri === path.rowIndex ? { ...r, align: nextAlign } : r,
                              ),
                            };
                          }),
                        );
                      }}
                    >
                      {ROW_ALIGN_OPTIONS.map((opt) => (
                        <option key={opt.value} class={ADMIN_NATIVE_OPTION_CLASS} value={opt.value}>
                          {translateApp(props.lang, opt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  </>
                  ) : null}
                  {inspectorTab.value === 'style' ? (
                    <div class="space-y-4">
                      <StyleModeSwitcher lang={props.lang} mode={previewTheme.value} onMode$={setPreviewTheme$} />
                      <InspectorAccordion title={translateApp(props.lang, 'builder.background.title')} group={STYLE_ACCORDION_GROUP} open>
                        <BuilderBackgroundFields
                          mode={previewTheme.value}
                          lang={props.lang}
                          settings={selectedRow?.settings}
                          onChange$={$(async (next) => {
                            const path = rowPathOf(selection.value);
                            if (!path) return;
                            const { bandIndex, rowIndex } = path;
                            await commit$(
                              bands.map((b, bi) => {
                                if (bi !== bandIndex) return b;
                                return {
                                  ...b,
                                  rows: b.rows.map((r, ri) =>
                                    ri === rowIndex ? { ...r, settings: next } : r,
                                  ),
                                };
                              }),
                            );
                          })}
                        />
                      </InspectorAccordion>
                      <BuilderStylePanel
                        openFirst={false}
                        showModeSwitcher={false}
                        mode={previewTheme.value}
                        onMode$={setPreviewTheme$}
                        lang={props.lang}
                        widgetType={CONTAINER_STYLE_TYPE}
                        styles={selectedRow?.styles}
                        device={previewDevice.value as StyleBreakpoint}
                        onDevice$={$((device: StyleBreakpoint) => {
                          previewDevice.value = device;
                        })}
                        onChange$={$(async (next: BuilderStyles) => {
                          const path = rowPathOf(selection.value);
                          if (!path) return;
                          const { bandIndex, rowIndex } = path;
                          await commit$(
                            bands.map((b, bi) => {
                              if (bi !== bandIndex) return b;
                              return {
                                ...b,
                                rows: b.rows.map((r, ri) =>
                                  ri === rowIndex ? { ...r, styles: next } : r,
                                ),
                              };
                            }),
                          );
                        })}
                      />
                    </div>
                  ) : null}
                  {inspectorTab.value === 'advanced' ? (
                    <BuilderResponsiveVisibilityFields
                      lang={props.lang}
                      hideOn={selectedRow?.hide_on}
                      onChange$={$(async (next: DeviceHideOn) => {
                        const path = rowPathOf(selection.value);
                        if (!path) return;
                        const { bandIndex, rowIndex } = path;
                        await commit$(
                          bands.map((b, bi) => {
                            if (bi !== bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) =>
                                ri === rowIndex ? { ...r, hide_on: normalizeHideOn(next) } : r,
                              ),
                            };
                          }),
                        );
                      })}
                    />
                  ) : null}
                </div>
              ) : null}

              {selection.value?.kind === 'column' ? (
                <div key={inspectorKey(selection.value)} class="space-y-3">
                  <p class="text-sm font-medium">
                    {translateApp(props.lang, 'pages.column')} {selection.value.colIndex + 1}
                  </p>
                  {inspectorTab.value === 'content' ? (
                  <>
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
                            const path = colPathOf(selection.value);
                            if (!path) return;
                            const { bandIndex, rowIndex, colIndex } = path;
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
                          selection.value &&
                          (selection.value.kind === 'column' || selection.value.kind === 'block')
                            ? normalizeColumnSpans(selectedCol?.span)[device]
                            : 12
                        }
                        onInput$={async (e) => {
                          const n = Number((e.target as HTMLInputElement).value);
                          const path = colPathOf(selection.value);
                          if (!path) return;
                          const { bandIndex, rowIndex, colIndex } = path;
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
                  <ColumnFlexFields
                    lang={props.lang}
                    flex={selectedCol?.flex}
                    onChange$={$(async (next: ColumnFlex | undefined) => {
                      const path = colPathOf(selection.value);
                      if (!path) return;
                      const { bandIndex, rowIndex, colIndex } = path;
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
                                  const { flex: _omit, ...rest } = c;
                                  return next ? { ...rest, flex: next } : rest;
                                }),
                              };
                            }),
                          };
                        }),
                      );
                    })}
                  />
                  </>
                  ) : null}
                  {inspectorTab.value === 'style' ? (
                    <div class="space-y-4">
                      <StyleModeSwitcher lang={props.lang} mode={previewTheme.value} onMode$={setPreviewTheme$} />
                      <InspectorAccordion title={translateApp(props.lang, 'builder.background.title')} group={STYLE_ACCORDION_GROUP} open>
                        <BuilderBackgroundFields
                          mode={previewTheme.value}
                          lang={props.lang}
                          settings={selectedCol?.settings}
                          onChange$={$(async (next) => {
                            const path = colPathOf(selection.value);
                            if (!path) return;
                            const { bandIndex, rowIndex, colIndex } = path;
                            await commit$(
                              bands.map((b, bi) => {
                                if (bi !== bandIndex) return b;
                                return {
                                  ...b,
                                  rows: b.rows.map((r, ri) => {
                                    if (ri !== rowIndex) return r;
                                    return {
                                      ...r,
                                      columns: r.columns.map((c, ci) =>
                                        ci === colIndex ? { ...c, settings: next } : c,
                                      ),
                                    };
                                  }),
                                };
                              }),
                            );
                          })}
                        />
                      </InspectorAccordion>
                      <BuilderStylePanel
                        openFirst={false}
                        showModeSwitcher={false}
                        mode={previewTheme.value}
                        onMode$={setPreviewTheme$}
                        lang={props.lang}
                        widgetType={CONTAINER_STYLE_TYPE}
                        styles={selectedCol?.styles}
                        device={previewDevice.value as StyleBreakpoint}
                        onDevice$={$((device: StyleBreakpoint) => {
                          previewDevice.value = device;
                        })}
                        onChange$={$(async (next: BuilderStyles) => {
                          const path = colPathOf(selection.value);
                          if (!path) return;
                          const { bandIndex, rowIndex, colIndex } = path;
                          await commit$(
                            bands.map((b, bi) => {
                              if (bi !== bandIndex) return b;
                              return {
                                ...b,
                                rows: b.rows.map((r, ri) => {
                                  if (ri !== rowIndex) return r;
                                  return {
                                    ...r,
                                    columns: r.columns.map((c, ci) =>
                                      ci === colIndex ? { ...c, styles: next } : c,
                                    ),
                                  };
                                }),
                              };
                            }),
                          );
                        })}
                      />
                    </div>
                  ) : null}
                  {inspectorTab.value === 'advanced' ? (
                    <BuilderResponsiveVisibilityFields
                      lang={props.lang}
                      hideOn={selectedCol?.hide_on}
                      onChange$={$(async (next: DeviceHideOn) => {
                        const path = colPathOf(selection.value);
                        if (!path) return;
                        const { bandIndex, rowIndex, colIndex } = path;
                        await commit$(
                          bands.map((b, bi) => {
                            if (bi !== bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) => {
                                if (ri !== rowIndex) return r;
                                return {
                                  ...r,
                                  columns: r.columns.map((c, ci) =>
                                    ci === colIndex
                                      ? { ...c, hide_on: normalizeHideOn(next) }
                                      : c,
                                  ),
                                };
                              }),
                            };
                          }),
                        );
                      })}
                    />
                  ) : null}
                </div>
              ) : null}

              {selection.value?.kind === 'block' && selectedBlock ? (
                <div key={inspectorKey(selection.value, `${selectedBlock.id}:${selectedBlock.type}`)} class="space-y-3">
                  <p class="text-sm font-medium">
                    {appearanceSectionLabel(
                      props.lang,
                      selectedBlock.type,
                      props.registry.value.find((r) => r.type === selectedBlock.type)?.label ||
                        selectedBlock.type,
                    )}
                  </p>
                  {inspectorTab.value === 'content' ? (
                  <>
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
                        categoryOptions={(props.previewSupport?.portfolioCategories ?? []).map((c) => ({
                          id: c.id,
                          name: c.name,
                          slug: c.slug,
                        }))}
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
                        dynamicTags={props.dynamicTags}
                      />
                    );
                  })()}
                  {selectedBlock.kind !== 'global' ? (
                    <button
                      type="button"
                      class="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                      onClick$={async () => {
                        try {
                          const res = await getApiClient(null).post(
                            API_ENDPOINTS.APPEARANCE.GLOBALS,
                            {
                              name: selectedBlock.type,
                              status: 'published',
                              document: {
                                kind: selectedBlock.kind || 'widget',
                                type: selectedBlock.type,
                                settings: selectedBlock.settings || {},
                              },
                            },
                          );
                          const id = Number((res.data as GlobalWidgetCreated | undefined)?.id);
                          if (!id) return;
                          await commit$(
                            updateBlockInBands(bands, selectedBlock.id, (blk) => ({
                              ...blk,
                              kind: 'global',
                              global_id: id,
                              type: 'global',
                            })),
                          );
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {translateApp(props.lang, 'pages.makeGlobal')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      class="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                      onClick$={async () => {
                        await commit$(
                          updateBlockInBands(bands, selectedBlock.id, (blk) => ({
                            ...blk,
                            kind: 'widget',
                            global_id: undefined,
                          })),
                        );
                      }}
                    >
                      {translateApp(props.lang, 'pages.unlinkGlobal')}
                    </button>
                  )}
                  </>
                  ) : null}
                  {inspectorTab.value === 'style' ? (
                    <div class="space-y-4">
                      <StyleModeSwitcher lang={props.lang} mode={previewTheme.value} onMode$={setPreviewTheme$} />
                      <InspectorAccordion title={translateApp(props.lang, 'builder.background.title')} group={STYLE_ACCORDION_GROUP} open>
                        <BuilderBackgroundFields
                          mode={previewTheme.value}
                          lang={props.lang}
                          settings={selectedBlockSettings}
                          onChange$={$(async (next) => {
                            await commit$(
                              updateBlockInBands(bands, selectedBlock.id, (blk) => ({
                                ...blk,
                                settings: next,
                              })),
                            );
                          })}
                        />
                      </InspectorAccordion>
                      <BuilderStylePanel
                        openFirst={false}
                        showModeSwitcher={false}
                        mode={previewTheme.value}
                        onMode$={setPreviewTheme$}
                        lang={props.lang}
                        widgetType={selectedBlock.type}
                        styles={selectedBlockStyles}
                        device={previewDevice.value as StyleBreakpoint}
                        onDevice$={$((device: StyleBreakpoint) => {
                          previewDevice.value = device;
                        })}
                        onChange$={$(async (next: BuilderStyles) => {
                          await commit$(
                            updateBlockInBands(bands, selectedBlock.id, (blk) => ({
                              ...blk,
                              styles: next,
                            })),
                          );
                        })}
                      />
                    </div>
                  ) : null}
                  {inspectorTab.value === 'advanced' ? (
                    <BuilderResponsiveVisibilityFields
                      lang={props.lang}
                      hideOn={selectedBlockHideOn}
                      onChange$={$(async (next: DeviceHideOn) => {
                        const sel = selection.value;
                        if (!sel || sel.kind !== 'block') return;
                        const { bandIndex, rowIndex, colIndex, blockIndex } = sel;
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
                                      blocks: c.blocks.map((bl, bli) =>
                                        bli === blockIndex
                                          ? { ...bl, hide_on: normalizeHideOn(next) }
                                          : bl,
                                      ),
                                    };
                                  }),
                                };
                              }),
                            };
                          }),
                        );
                      })}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
          </>
        ) : (
          <>
          {/* Widget / Kits palette */}
          <aside class="flex w-80 flex-shrink-0 flex-col border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
            <div class="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
              <div class="inline-flex w-full rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
                <button
                  type="button"
                  class={[
                    'flex-1 rounded-md px-2 py-1 text-xs font-semibold',
                    paletteTab.value === 'widgets'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                  onClick$={() => {
                    paletteTab.value = 'widgets';
                  }}
                >
                  {translateApp(props.lang, 'pages.widgetsTab')}
                </button>
                <button
                  type="button"
                  class={[
                    'flex-1 rounded-md px-2 py-1 text-xs font-semibold',
                    paletteTab.value === 'kits'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                  onClick$={() => {
                    paletteTab.value = 'kits';
                  }}
                >
                  {translateApp(props.lang, 'pages.kitsTab')}
                </button>
                <button
                  type="button"
                  class={[
                    'flex-1 rounded-md px-2 py-1 text-xs font-semibold',
                    paletteTab.value === 'globals'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                  onClick$={() => {
                    paletteTab.value = 'globals';
                  }}
                >
                  {translateApp(props.lang, 'pages.globalsTab')}
                </button>
              </div>
              <input
                type="search"
                class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-slate-950"
                placeholder={translateApp(props.lang, 'pages.paletteSearch')}
                value={paletteSearch.value}
                onInput$={(e) => {
                  paletteSearch.value = (e.target as HTMLInputElement).value;
                }}
              />
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
              <p class="text-[11px] text-gray-500 dark:text-gray-400">
                {translateApp(props.lang, 'pages.dragWidgetsHint')}
              </p>
              {savedBands.value.length > 0 ? (
                <div class="space-y-1">
                  <p class="text-[11px] font-semibold uppercase text-gray-500">
                    {translateApp(props.lang, 'pages.savedSections')}
                  </p>
                  {savedBands.value.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      class="w-full rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-start text-xs dark:border-gray-600"
                      onClick$={async () => {
                        const clone = JSON.parse(JSON.stringify(row.band)) as PageLayoutBand;
                        clone.id = newBlockId('band');
                        await commit$([...bands, clone]);
                      }}
                    >
                      {row.name}
                    </button>
                  ))}
                </div>
              ) : null}
              {paletteTab.value === 'globals'
                ? globalsList.value.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-start text-sm dark:border-gray-700 dark:bg-slate-950"
                      onClick$={async () => {
                        const sel = selection.value;
                        const block: PageLayoutBlock = {
                          id: newBlockId('global'),
                          kind: 'global',
                          type: 'global',
                          global_id: g.id,
                          enabled: true,
                          settings: {},
                        };
                        if (sel?.kind === 'column' || sel?.kind === 'block') {
                          const next = bands.map((b, bi) => {
                            if (bi !== sel.bandIndex) return b;
                            return {
                              ...b,
                              rows: b.rows.map((r, ri) => {
                                if (ri !== sel.rowIndex) return r;
                                return {
                                  ...r,
                                  columns: r.columns.map((c, ci) => {
                                    if (ci !== sel.colIndex) return c;
                                    return { ...c, blocks: [...c.blocks, block] };
                                  }),
                                };
                              }),
                            };
                          });
                          await commit$(next);
                          return;
                        }
                        const band = createEmptyBand();
                        band.rows[0].columns[0].blocks = [block];
                        await commit$([...bands, band]);
                      }}
                    >
                      {g.name}
                    </button>
                  ))
                : null}
              {insertableByCategory.map(([category, entries]) => (
                <div key={category} class="space-y-1.5">
                  <p class="pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {category}
                  </p>
                  {entries.map((entry) => (
                <button
                  key={`${entry.kind || 'kit'}:${entry.type}`}
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
                    // Prefer selected column; else row remaining span; else new band.
                    const sel = selection.value;
                    if (sel?.kind === 'column' || sel?.kind === 'block') {
                      const inserted = insertWidgetIntoColumn(
                        bands,
                        props.registry.value,
                        entry.type,
                        sel.bandIndex,
                        sel.rowIndex,
                        sel.colIndex,
                      );
                      if (!inserted) return;
                      await commit$(inserted.bands);
                      selection.value = {
                        kind: 'block',
                        bandIndex: sel.bandIndex,
                        rowIndex: sel.rowIndex,
                        colIndex: sel.colIndex,
                        blockIndex: inserted.blockIndex,
                      };
                      return;
                    }
                    const preferRow: RowPath | null =
                      sel?.kind === 'row'
                        ? { bandIndex: sel.bandIndex, rowIndex: sel.rowIndex }
                        : sel?.kind === 'band'
                          ? { bandIndex: sel.bandIndex, rowIndex: 0 }
                          : null;
                    const target = findRowWithRemaining(bands, previewDevice.value, preferRow);
                    if (target) {
                      const inserted = insertWidgetIntoRemaining(
                        bands,
                        props.registry.value,
                        entry.type,
                        target.bandIndex,
                        target.rowIndex,
                        previewDevice.value,
                      );
                      if (!inserted) return;
                      await commit$(inserted.bands);
                      selection.value = {
                        kind: 'block',
                        bandIndex: target.bandIndex,
                        rowIndex: target.rowIndex,
                        colIndex: inserted.colIndex,
                        blockIndex: inserted.blockIndex,
                      };
                      return;
                    }
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
              ))}
            </div>
          </aside>
          </>
        )}

        {showNavigator.value ? (
          <PageBuilderNavigator
            lang={props.lang}
            bands={bands}
            selection={selection.value}
            onSelect$={$((next) => {
              selection.value = next;
            })}
            onMove$={$(async (from, to, position) => {
              const current = ensurePageLayoutBands(props.sections.value);
              const moved = moveLayoutTreeNode(current, from, to, position);
              if (!moved) return;
              await commit$(moved.bands);
              selection.value = navigatorPathToSelection(moved.path);
            })}
            onClose$={$(() => {
              showNavigator.value = false;
            })}
            onContextMenu$={$((e: MouseEvent, path: LayoutTreePath) => openContextMenu$(e, path, true))}
          />
        ) : null}

        {contextMenu.value ? (
          <PageBuilderContextMenu
            key={`${contextMenu.value.path.join('.')}-${contextMenu.value.x}-${contextMenu.value.y}`}
            lang={props.lang}
            x={contextMenu.value.x}
            y={contextMenu.value.y}
            label={builderNodeLabel(bands, contextMenu.value.path, props.registry.value, props.lang)}
            canPaste={canPasteLayoutNode(bands, contextMenu.value.path, readNodeClipboard())}
            canPasteStyle={canPasteLayoutNodeStyle(bands, contextMenu.value.path, readStyleClipboard())}
            fromNavigator={contextMenu.value.fromNavigator}
            onAction$={$(async (action: BuilderNodeAction) => {
              const target = contextMenu.value;
              if (target) await runNodeAction$(action, target.path);
            })}
            onClose$={$(() => {
              contextMenu.value = null;
            })}
          />
        ) : null}

        {viewMode.value ? (
          <PageBuilderViewMode
            lang={props.lang}
            ctx={previewCtx}
            theme={previewTheme.value}
            onTheme$={setPreviewTheme$}
            bands={bandsWithBuilderMediaPreview(resolvedBands ?? bands, props.registry.value, mediaPreviewById.value)}
            chromeKind={
              props.exportBuilderKind === 'header' || props.exportBuilderKind === 'footer'
                ? props.exportBuilderKind
                : undefined
            }
            device={previewDevice}
            onClose$={$(() => {
              viewMode.value = false;
            })}
          />
        ) : null}

        {/* Canvas — final render with editor outlines/handles, sized to active device */}
        <main class="min-w-0 flex-1 overflow-auto bg-slate-200/60 p-4 sm:p-6 dark:bg-slate-950/60">
          {/* data-builder-canvas: admin CSS maps md:/lg: to container queries on this frame (postcss/builder-canvas-container-queries.js) */}
          <div
            data-public-page
            data-builder-canvas
            data-preview-theme={previewTheme.value}
            style={{
              containerType: 'inline-size',
              containerName: 'builder-canvas',
              colorScheme: previewTheme.value,
            }}
            class={[
              // Theme scope: nearest `.light` / `.dark` wins, so the canvas can differ from the admin.
              previewTheme.value,
              previewFrameClass(previewDevice.value),
              // Opaque gradients matching the public `body` in site.css, so the admin backdrop never shows through.
              'relative isolate bg-[linear-gradient(135deg,#fafbfc_0%,#f5f7fa_100%)] text-slate-900 shadow-lg transition-[max-width] duration-300 dark:bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] dark:text-slate-100',
              // Header/footer strips size to their content; pages keep a tall drop area.
              previewCtx.surface === 'chrome' ? 'py-3' : 'min-h-[60vh]',
            ].join(' ')}
          >
            <LayoutDeviceProvider device={previewDevice.value}>
            {bands.length === 0 ? (
              <div
                class={[
                  'm-4 rounded-xl border border-dashed px-6 py-16 text-center',
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
              <>
                {bands.map((band, bandIndex) => {
                  const bandSelected =
                    selection.value?.kind === 'band' && selection.value.bandIndex === bandIndex;
                  const boxed = (band.layout_width ?? 'boxed') !== 'full';
                  // Locals, not `band.settings` in JSX: the optimizer marks member props on plain
                  // loop items immutable, so the shell would never see background/style edits.
                  const bandSettings = band.settings;
                  const bandStyles = band.styles;
                  return (
                    <section
                      key={band.id}
                      data-builder-node
                      class={[
                        'group/band relative',
                        boxed ? 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8' : 'w-full',
                        hiddenOnDeviceClass(band, previewDevice.value),
                      ].join(' ')}
                      onClick$={(e, el) => {
                        if (isOwnBuilderNodeClick(e, el)) {
                          selection.value = { kind: 'band', bandIndex };
                        }
                      }}
                      preventdefault:contextmenu
                      onContextMenu$={(e, el) => {
                        if (isOwnBuilderNodeClick(e, el)) openContextMenu$(e, [bandIndex]);
                      }}
                    >
                      <div
                        aria-hidden="true"
                        class={builderOutlineClass(bandSelected, false, 'group-hover/band:outline-primary-300')}
                      />
                      {/* Band handle */}
                      <div
                        stoppropagation:click
                        class={[
                          'absolute start-1/2 top-0 z-40 -translate-x-1/2 items-center gap-0.5 rounded-b-md bg-primary-600 px-1 py-0.5 text-[11px] font-medium text-white shadow rtl:translate-x-1/2',
                          bandSelected ? 'flex' : 'hidden group-hover/band:flex',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          class="rounded px-1.5 py-0.5 hover:bg-primary-700"
                          onClick$={() => {
                            selection.value = { kind: 'band', bandIndex };
                          }}
                        >
                          {translateApp(props.lang, 'pages.band')} {bandIndex + 1}
                        </button>
                        {/* Insert an empty band before this one */}
                        <button
                          type="button"
                          class="rounded px-1.5 py-0.5 hover:bg-primary-700"
                          title={translateApp(props.lang, 'pages.addBandAbove')}
                          onClick$={async () => {
                            const next = [...bands.slice(0, bandIndex), createEmptyBand(), ...bands.slice(bandIndex)];
                            const shifted = shiftSelectionForBandInsert(selection.value, bandIndex);
                            await commit$(next);
                            if (shifted !== selection.value) {
                              selectionReindexed.value = true;
                              selection.value = shifted;
                            }
                          }}
                        >
                          + {translateApp(props.lang, 'pages.addBandAbove')}
                        </button>
                        <button
                          type="button"
                          class="rounded px-1.5 py-0.5 hover:bg-primary-700"
                          onClick$={async () => {
                            const next = bands.map((b, i) =>
                              i === bandIndex
                                ? { ...b, rows: [...b.rows, createEmptyRow(2)] }
                                : b,
                            );
                            await commit$(next);
                          }}
                        >
                          + {translateApp(props.lang, 'pages.addRow')}
                        </button>
                        <button
                          type="button"
                          class="rounded px-1.5 py-0.5 font-bold hover:bg-red-600"
                          title={translateApp(props.lang, 'appearance.remove')}
                          aria-label={translateApp(props.lang, 'appearance.remove')}
                          onClick$={async () => {
                            selection.value = null;
                            await commit$(
                              ensurePageLayoutBands(props.sections.value).filter(
                                (_, i) => i !== bandIndex,
                              ),
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <LayoutNodeShell
                        id={band.id}
                        settings={bandSettings}
                        styles={bandStyles}
                        class={
                          previewCtx.surface === 'chrome'
                            ? 'w-full'
                            : 'w-full py-6 sm:py-8 lg:py-10'
                        }
                      >
                        {band.rows.length === 0 ? (
                          <div class="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500 dark:border-gray-600">
                            {translateApp(props.lang, 'pages.addRow')}
                          </div>
                        ) : null}
                        {band.rows.map((row, rowIndex) => {
                          const rowSelected =
                            selection.value?.kind === 'row' &&
                            selection.value.bandIndex === bandIndex &&
                            selection.value.rowIndex === rowIndex;
                          const stackBelow = row.stack_below || 'none';
                          const usedSpan = usedSpanInRow(row, previewDevice.value);
                          const remaining = Math.max(0, 12 - usedSpan);
                          const rowKey = `${bandIndex}-${rowIndex}`;
                          const isRowDropTarget = dropRowKey.value === rowKey;
                          const dragging = !!(dragWidgetType.value || dragBlock.value);
                          const rowSettings = row.settings;
                          const rowStyles = row.styles;
                          return (
                            <div
                              key={row.id}
                              data-builder-node
                              class={[
                                'group/row relative',
                                hiddenOnDeviceClass(row, previewDevice.value),
                              ].join(' ')}
                              onClick$={(e, el) => {
                                if (isOwnBuilderNodeClick(e, el)) {
                                  selection.value = { kind: 'row', bandIndex, rowIndex };
                                }
                              }}
                              preventdefault:contextmenu
                              onContextMenu$={(e, el) => {
                                if (isOwnBuilderNodeClick(e, el)) openContextMenu$(e, [bandIndex, rowIndex]);
                              }}
                              onDragOver$={(e) => {
                                if (dragWidgetType.value || dragBlock.value) {
                                  e.preventDefault();
                                  dropRowKey.value = rowKey;
                                }
                              }}
                              onDragLeave$={() => {
                                if (dropRowKey.value === rowKey) {
                                  dropRowKey.value = null;
                                }
                              }}
                              onDrop$={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const widgetType =
                                  dragWidgetType.value ||
                                  e.dataTransfer?.getData(WIDGET_DND) ||
                                  null;
                                const from = dragBlock.value;
                                dropColumnKey.value = null;
                                dropRowKey.value = null;
                                dragWidgetType.value = null;
                                dragBlock.value = null;

                                if (from) {
                                  const moved = moveBlockIntoRemaining(
                                    bands,
                                    from,
                                    bandIndex,
                                    rowIndex,
                                    previewDevice.value,
                                  );
                                  if (!moved) return;
                                  await commit$(moved.bands);
                                  selection.value = {
                                    kind: 'block',
                                    bandIndex,
                                    rowIndex,
                                    colIndex: moved.colIndex,
                                    blockIndex: moved.blockIndex,
                                  };
                                  return;
                                }

                                if (
                                  widgetType &&
                                  props.registry.value.some((r) => r.type === widgetType)
                                ) {
                                  const inserted = insertWidgetIntoRemaining(
                                    bands,
                                    props.registry.value,
                                    widgetType,
                                    bandIndex,
                                    rowIndex,
                                    previewDevice.value,
                                  );
                                  if (!inserted) return;
                                  await commit$(inserted.bands);
                                  selection.value = {
                                    kind: 'block',
                                    bandIndex,
                                    rowIndex,
                                    colIndex: inserted.colIndex,
                                    blockIndex: inserted.blockIndex,
                                  };
                                }
                              }}
                            >
                              <div
                                aria-hidden="true"
                                class={builderOutlineClass(
                                  rowSelected,
                                  isRowDropTarget,
                                  'group-hover/row:outline-sky-400',
                                )}
                              />
                              {/* Row handle */}
                              <div
                                stoppropagation:click
                                class={[
                                  'absolute start-0 top-0 z-40 items-center gap-0.5 rounded-ee-md bg-sky-600 px-1 py-0.5 text-[11px] font-medium text-white shadow',
                                  rowSelected ? 'flex' : 'hidden group-hover/row:flex',
                                ].join(' ')}
                              >
                                <button
                                  type="button"
                                  class="rounded px-1.5 py-0.5 hover:bg-sky-700"
                                  onClick$={() => {
                                    selection.value = { kind: 'row', bandIndex, rowIndex };
                                  }}
                                >
                                  {translateApp(props.lang, 'pages.row')} {rowIndex + 1} · {usedSpan}/12
                                </button>
                                {/* Insert an empty row before this one */}
                                <button
                                  type="button"
                                  class="rounded px-1.5 py-0.5 hover:bg-sky-700"
                                  title={translateApp(props.lang, 'pages.addRowAbove')}
                                  onClick$={async () => {
                                    const next = bands.map((b, bi) =>
                                      bi === bandIndex
                                        ? {
                                            ...b,
                                            rows: [
                                              ...b.rows.slice(0, rowIndex),
                                              createEmptyRow(2),
                                              ...b.rows.slice(rowIndex),
                                            ],
                                          }
                                        : b,
                                    );
                                    const shifted = shiftSelectionForRowInsert(selection.value, bandIndex, rowIndex);
                                    await commit$(next);
                                    if (shifted !== selection.value) {
                                      selectionReindexed.value = true;
                                      selection.value = shifted;
                                    }
                                  }}
                                >
                                  + {translateApp(props.lang, 'pages.addRowAbove')}
                                </button>
                                <button
                                  type="button"
                                  class="rounded px-1.5 py-0.5 hover:bg-sky-700"
                                  onClick$={async () => {
                                    const free = Math.max(
                                      0,
                                      12 - usedSpanInRow(row, previewDevice.value),
                                    );
                                    const span = free > 0 ? free : 6;
                                    const next = bands.map((b, bi) => {
                                      if (bi !== bandIndex) return b;
                                      return {
                                        ...b,
                                        rows: b.rows.map((r, ri) =>
                                          ri === rowIndex
                                            ? {
                                                ...r,
                                                columns: [
                                                  ...r.columns,
                                                  createEmptyColumn(span),
                                                ],
                                              }
                                            : r,
                                        ),
                                      };
                                    });
                                    await commit$(next);
                                  }}
                                >
                                  + {translateApp(props.lang, 'pages.addColumn')}
                                </button>
                                <button
                                  type="button"
                                  class="rounded px-1.5 py-0.5 hover:bg-sky-700"
                                  onClick$={async () => {
                                    const sel = selection.value;
                                    const colIndex =
                                      sel &&
                                      (sel.kind === 'column' || sel.kind === 'block') &&
                                      sel.bandIndex === bandIndex &&
                                      sel.rowIndex === rowIndex
                                        ? sel.colIndex
                                        : 0;
                                    const next = bands.map((b, bi) => {
                                      if (bi !== bandIndex) return b;
                                      return {
                                        ...b,
                                        rows: b.rows.map((r, ri) => {
                                          if (ri !== rowIndex) return r;
                                          return {
                                            ...r,
                                            columns: r.columns.map((c, ci) =>
                                              ci === colIndex
                                                ? { ...c, blocks: [...c.blocks, createInnerBand()] }
                                                : c,
                                            ),
                                          };
                                        }),
                                      };
                                    });
                                    await commit$(next);
                                  }}
                                >
                                  + {translateApp(props.lang, 'pages.addInnerBand')}
                                </button>
                              </div>

                              <LayoutNodeShell
                                id={row.id}
                                settings={rowSettings}
                                styles={rowStyles}
                                class="w-full rounded-xl"
                              >
                                {/* Exact device grid: 12 cols + effective span for active device */}
                                <div
                                  class={[
                                    'grid grid-cols-12 items-stretch',
                                    rowGapClass(row.gap),
                                    row.direction === 'column' ? 'flex flex-col' : '',
                                  ].join(' ')}
                                  style={rowFlexStyle(row)}
                                >
                                  {row.columns.map((col, colIndex) => {
                                    const spans = normalizeColumnSpans(col.span);
                                    const effective = effectiveSpanForDevice(
                                      spans,
                                      stackBelow,
                                      previewDevice.value,
                                    );
                                    const colKey = `${bandIndex}-${rowIndex}-${colIndex}`;
                                    const isDropTarget = dropColumnKey.value === colKey;
                                    const colSettings = col.settings;
                                    const colStyles = col.styles;
                                    const colSelected =
                                      selection.value?.kind === 'column' &&
                                      selection.value.bandIndex === bandIndex &&
                                      selection.value.rowIndex === rowIndex &&
                                      selection.value.colIndex === colIndex;
                                    return (
                                      <div
                                        key={col.id}
                                        data-builder-node
                                        class={[
                                          previewColSpanClass(effective),
                                          'group/col relative min-h-12',
                                          hiddenOnDeviceClass(col, previewDevice.value),
                                        ].join(' ')}
                                        onClick$={(e, el) => {
                                          if (isOwnBuilderNodeClick(e, el)) {
                                            selection.value = {
                                              kind: 'column',
                                              bandIndex,
                                              rowIndex,
                                              colIndex,
                                            };
                                          }
                                        }}
                                        preventdefault:contextmenu
                                        onContextMenu$={(e, el) => {
                                          if (isOwnBuilderNodeClick(e, el)) {
                                            openContextMenu$(e, [bandIndex, rowIndex, colIndex]);
                                          }
                                        }}
                                        onDragOver$={(e) => {
                                          if (dragWidgetType.value || dragBlock.value) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            dropColumnKey.value = colKey;
                                            dropRowKey.value = null;
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
                                          dropRowKey.value = null;
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
                                        <div
                                          aria-hidden="true"
                                          class={builderOutlineClass(
                                            colSelected,
                                            isDropTarget,
                                            'group-hover/col:outline-gray-400',
                                          )}
                                        />
                                        {/* Column handle */}
                                        <div
                                          stoppropagation:click
                                          class={[
                                            'absolute end-0 top-0 z-40 items-center gap-0.5 rounded-es-md bg-gray-700 px-1 py-0.5 text-[11px] font-medium text-white shadow',
                                            colSelected ? 'flex' : 'hidden group-hover/col:flex',
                                          ].join(' ')}
                                        >
                                          <button
                                            type="button"
                                            class="rounded px-1.5 py-0.5 hover:bg-gray-800"
                                            title={translateApp(props.lang, 'pages.editColumn')}
                                            onClick$={() => {
                                              selection.value = {
                                                kind: 'column',
                                                bandIndex,
                                                rowIndex,
                                                colIndex,
                                              };
                                            }}
                                          >
                                            {translateApp(props.lang, 'pages.column')} {colIndex + 1} · {effective}/12
                                          </button>
                                          <button
                                            type="button"
                                            class="rounded px-1.5 py-0.5 font-bold hover:bg-red-600"
                                            title={translateApp(props.lang, 'pages.removeColumn')}
                                            aria-label={translateApp(props.lang, 'pages.removeColumn')}
                                            onClick$={async () => {
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

                                        <LayoutNodeShell
                                          id={col.id}
                                          settings={colSettings}
                                          styles={colStyles}
                                          class="h-full"
                                        >
                                          <div
                                            class={columnContentLayout(row, col).class}
                                            style={columnContentLayout(row, col).style}
                                          >
                                            {col.blocks.length === 0 ? (
                                              <div class="flex min-h-16 items-center justify-center rounded border border-dashed border-gray-300 px-2 text-center text-[11px] text-gray-400 dark:border-gray-600">
                                                {translateApp(props.lang, 'pages.dropWidgetHere')}
                                              </div>
                                            ) : null}
                                            {col.blocks.map((block, blockIndex) => {
                                              const entry = props.registry.value.find(
                                                (r) => r.type === block.type,
                                              );
                                              const blockLabel = appearanceSectionLabel(
                                                props.lang,
                                                block.type,
                                                entry?.label || block.type,
                                              );
                                              const blockSelected =
                                                selection.value?.kind === 'block' &&
                                                selection.value.bandIndex === bandIndex &&
                                                selection.value.rowIndex === rowIndex &&
                                                selection.value.colIndex === colIndex &&
                                                selection.value.blockIndex === blockIndex;
                                              const resolved =
                                                resolvedBands?.[bandIndex]?.rows[rowIndex]?.columns[colIndex]
                                                  ?.blocks[blockIndex];
                                              const shown =
                                                resolved && resolved.id === block.id ? resolved : block;
                                              return (
                                                <div
                                                  key={block.id}
                                                  data-builder-node
                                                  preventdefault:click
                                                  class={[
                                                    'group/block relative cursor-pointer',
                                                    block.enabled === false ? 'opacity-40' : '',
                                                    hiddenOnDeviceClass(block, previewDevice.value),
                                                  ].join(' ')}
                                                  onClick$={(e, el) => {
                                                    if (isOwnBuilderNodeClick(e, el)) {
                                                      selection.value = {
                                                        kind: 'block',
                                                        bandIndex,
                                                        rowIndex,
                                                        colIndex,
                                                        blockIndex,
                                                      };
                                                    }
                                                  }}
                                                  preventdefault:contextmenu
                                                  onContextMenu$={(e, el) => {
                                                    if (isOwnBuilderNodeClick(e, el)) {
                                                      openContextMenu$(e, [bandIndex, rowIndex, colIndex, blockIndex]);
                                                    }
                                                  }}
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
                                                  {/* Final render; embeds are inert so clicks reach the editor */}
                                                  <div
                                                    data-label={blockLabel}
                                                    class="[&_iframe]:pointer-events-none [&_video]:pointer-events-none empty:flex empty:min-h-10 empty:items-center empty:justify-center empty:rounded empty:border empty:border-dashed empty:border-gray-300 empty:text-xs empty:text-gray-400 empty:before:content-[attr(data-label)] dark:empty:border-gray-600"
                                                  >
                                                    <PageBuilderCanvasBlock
                                                      block={withBuilderMediaPreview(shown, props.registry.value, mediaPreviewById.value)}
                                                      ctx={previewCtx}
                                                    />
                                                  </div>
                                                  <div
                                                    aria-hidden="true"
                                                    class={builderOutlineClass(
                                                      blockSelected,
                                                      false,
                                                      'group-hover/block:outline-primary-400',
                                                    )}
                                                  />
                                                  {/* Block handle: drag grip + label + remove */}
                                                  <div
                                                    stoppropagation:click
                                                    class={[
                                                      'absolute end-0 top-0 z-40 items-center gap-0.5 rounded-es-md bg-primary-600 px-1 py-0.5 text-[11px] font-medium text-white shadow',
                                                      blockSelected ? 'flex' : 'hidden group-hover/block:flex',
                                                    ].join(' ')}
                                                  >
                                                    <span
                                                      draggable={true}
                                                      class="flex cursor-grab items-center gap-1 rounded px-1.5 py-0.5 hover:bg-primary-700 active:cursor-grabbing"
                                                      title={blockLabel}
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
                                                    >
                                                      <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path d="M7 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 16a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                                      </svg>
                                                      <span class="max-w-[10rem] truncate">{blockLabel}</span>
                                                    </span>
                                                    <button
                                                      type="button"
                                                      class="rounded px-1.5 py-0.5 font-bold hover:bg-red-600"
                                                      title={translateApp(props.lang, 'pages.removeWidget')}
                                                      aria-label={translateApp(props.lang, 'pages.removeWidget')}
                                                      onClick$={async () => {
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
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </LayoutNodeShell>
                                      </div>
                                    );
                                  })}
                                  {remaining > 0 && dragging ? (
                                    <div
                                      class={[
                                        previewColSpanClass(remaining),
                                        'flex min-h-16 items-center justify-center rounded-md border border-dashed border-primary-400/60 bg-primary-50/30 px-2 text-center text-[11px] text-primary-700 dark:border-primary-500/50 dark:bg-primary-950/20 dark:text-primary-300',
                                        isRowDropTarget && !dropColumnKey.value
                                          ? 'ring-2 ring-primary-500/40'
                                          : '',
                                      ].join(' ')}
                                    >
                                      {translateApp(props.lang, 'pages.dropWidgetHere')}
                                    </div>
                                  ) : null}
                                </div>
                              </LayoutNodeShell>
                            </div>
                          );
                        })}
                      </LayoutNodeShell>
                    </section>
                  );
                })}
              </>
            )}
            </LayoutDeviceProvider>
          </div>
        </main>

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
            const nested = /^([a-zA-Z0-9_]+)\.(\d+)\.([a-zA-Z0-9_]+)$/.exec(target.key);
            if (nested) {
              const [, parentKey, idxStr, childKey] = nested;
              const parentField = entry?.settings_fields?.find((f) => f.key === parentKey);
              const translatable = parentField ? isAppearanceFieldTranslatable(parentField) : false;
              const locale = props.activeLocale.value;
              const def = props.defaultLocale;
              props.sections.value = updateBlockInBands(current, target.blockId, (blk) => {
                const settings = { ...(blk.settings ?? {}) };
                const rawRows = readAppearanceSettingValue(
                  settings,
                  parentKey,
                  locale,
                  def,
                  translatable,
                );
                const rows = Array.isArray(rawRows)
                  ? (rawRows as Record<string, unknown>[]).map((r) => ({ ...r }))
                  : [];
                const idx = Number(idxStr);
                while (rows.length <= idx) rows.push({});
                rows[idx] = { ...rows[idx], [childKey]: media.id };
                return {
                  ...blk,
                  settings: writeAppearanceSettingValue(
                    settings,
                    parentKey,
                    rows,
                    locale,
                    def,
                    translatable,
                  ),
                };
              });
              return;
            }
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
