/**
 * Pure CMS Pages layout helpers safe for public + admin bundles.
 */

import type {
  ColumnFlex,
  ColumnFlexAlign,
  ColumnFlexJustify,
  ColumnSpans,
  LayoutBreakpoint,
  PageLayoutBand,
  PageLayoutColumn,
  PageLayoutRow,
  PageLayoutStackBelow,
  PageSectionNode,
} from './appearance-types';
import { FULL_COLUMN_SPANS } from './appearance-types';

export function isPageLayoutBand(node: PageSectionNode | null | undefined): node is PageLayoutBand {
  if (!node || typeof node !== 'object') return false;
  return node.type === 'layout' || Array.isArray((node as PageLayoutBand).rows);
}

export function clampSpan(n: number): number {
  if (!Number.isFinite(n)) return 12;
  const i = Math.round(n);
  if (i < 1) return 1;
  if (i > 12) return 12;
  return i;
}

export function normalizeColumnSpans(span: unknown): ColumnSpans {
  if (typeof span === 'number') {
    const n = clampSpan(span);
    return { mobile: n, tablet: n, desktop: n };
  }
  if (!span || typeof span !== 'object' || Array.isArray(span)) {
    return { ...FULL_COLUMN_SPANS };
  }
  const s = span as Record<string, unknown>;
  const desktop = clampSpan(Number(s.desktop ?? s.lg ?? 12));
  const tablet = clampSpan(Number(s.tablet ?? s.md ?? desktop));
  const mobile = clampSpan(Number(s.mobile ?? s.sm ?? 12));
  return { mobile, tablet, desktop };
}

const COL_SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

const MD_COL_SPAN: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
};

const LG_COL_SPAN: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
};

/**
 * Tailwind grid column classes for public render.
 * Breakpoints: default = mobile, md = tablet, lg = desktop.
 */
export function columnSpanClassNames(
  span: ColumnSpans,
  stackBelow: PageLayoutStackBelow = 'none',
): string {
  const mobile = clampSpan(span.mobile);
  const tablet = clampSpan(span.tablet);
  const desktop = clampSpan(span.desktop);

  let mobileSpan = mobile;
  let tabletSpan = tablet;
  if (stackBelow === 'desktop') {
    mobileSpan = 12;
    tabletSpan = 12;
  } else if (stackBelow === 'tablet') {
    mobileSpan = 12;
  }

  return [COL_SPAN[mobileSpan], MD_COL_SPAN[tabletSpan], LG_COL_SPAN[desktop]].join(' ');
}

/**
 * Span used for a single preview device (builder mock device + stack_below rules).
 */
export function effectiveSpanForDevice(
  span: ColumnSpans | unknown,
  stackBelow: PageLayoutStackBelow = 'none',
  device: LayoutBreakpoint,
): number {
  const normalized = normalizeColumnSpans(span);
  if (stackBelow === 'desktop' && (device === 'mobile' || device === 'tablet')) {
    return 12;
  }
  if (stackBelow === 'tablet' && device === 'mobile') {
    return 12;
  }
  return clampSpan(normalized[device]);
}

/** Static Tailwind class for a single span (builder device preview — no responsive prefixes). */
export function previewColSpanClass(span: number): string {
  return COL_SPAN[clampSpan(span)] ?? 'col-span-12';
}

const ROW_GAP_CLASS: Record<number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16',
};

/** Grid gap class for a layout row (`row.gap`, default 4). */
export function rowGapClass(gap: unknown): string {
  const n = typeof gap === 'number' ? gap : 4;
  return ROW_GAP_CLASS[n] ?? 'gap-4';
}

/** Inline justify / align / wrap for a layout row grid. */
export function rowFlexStyle(row: Pick<PageLayoutRow, 'justify' | 'align' | 'wrap'>): Record<string, string> {
  const justify =
    row.justify === 'center'
      ? 'center'
      : row.justify === 'end'
        ? 'end'
        : row.justify === 'between'
          ? 'space-between'
          : 'start';
  const align =
    row.align === 'start' || row.align === 'center' || row.align === 'end' ? row.align : 'stretch';
  return {
    justifyContent: justify,
    alignItems: align,
    flexWrap: row.wrap === false ? 'nowrap' : 'wrap',
  };
}

/**
 * Vertical position of a column's blocks for the row's `align`. Columns stay full height so their
 * backgrounds fill the row; the blocks inside move instead.
 */
export function columnContentAlignClass(row: Pick<PageLayoutRow, 'align'>): string {
  if (row.align === 'center') return 'flex flex-col justify-center';
  if (row.align === 'end') return 'flex flex-col justify-end';
  return '';
}

export const DEFAULT_COLUMN_FLEX: ColumnFlex = {
  direction: 'column',
  justify: 'start',
  align: 'stretch',
  wrap: true,
  gap: 6,
};

const FLEX_JUSTIFY_CSS: Record<ColumnFlexJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

const FLEX_ALIGN_CSS: Record<ColumnFlexAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

/**
 * Class + inline style for the element wrapping a column's blocks. Columns with `flex` use it;
 * older columns keep the vertical stack (`stackClass`) positioned by the row's `align`.
 */
export function columnContentLayout(
  row: Pick<PageLayoutRow, 'align'>,
  col: Pick<PageLayoutColumn, 'flex'>,
  stackClass = 'space-y-6',
): { class: string; style?: Record<string, string> } {
  const flex = col.flex;
  if (!flex) {
    return { class: ['h-full', stackClass, columnContentAlignClass(row)].filter(Boolean).join(' ') };
  }
  return {
    class: 'flex h-full min-w-0',
    style: {
      flexDirection: flex.direction === 'row' ? 'row' : 'column',
      justifyContent: FLEX_JUSTIFY_CSS[flex.justify] ?? 'flex-start',
      alignItems: FLEX_ALIGN_CSS[flex.align] ?? 'stretch',
      flexWrap: flex.wrap === false ? 'nowrap' : 'wrap',
      gap: `${Math.min(16, Math.max(0, Number(flex.gap) || 0)) * 0.25}rem`,
    },
  };
}

/**
 * Class for the element around one block in a column, or null when none is needed. Flex columns
 * always wrap blocks, matching the builder canvas: leaves default to `width: 100%`, so as direct
 * flex items they would fill the column and ignore `align` / `justify`.
 */
export function columnBlockWrapperClass(
  col: Pick<PageLayoutColumn, 'flex'>,
  hideClass: string,
): string | null {
  if (col.flex) return ['relative', hideClass].filter(Boolean).join(' ');
  return hideClass || null;
}

/** Kit `limit` fields are stored as 1–24 in Appearance / Theme Builder. */
export const KIT_ITEM_LIMIT_MAX = 24;

export function parseKitItemLimit(raw: unknown, fallback: number, max = KIT_ITEM_LIMIT_MAX): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.min(max, Math.floor(n));
}

/**
 * Highest `settings.limit` for kits of `type` in a flat homepage list or nested page-layout tree.
 * Used so SSR fetches enough items for Theme Builder / Appearance limits.
 */
export function maxSectionSettingLimit(
  nodes: PageSectionNode[] | null | undefined,
  type: string,
  fallback: number,
  max = KIT_ITEM_LIMIT_MAX,
): number {
  let found = 0;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const n = node as Record<string, unknown>;
    if (n.enabled === false) {
      return;
    }
    if (n.type === type) {
      const settings =
        n.settings && typeof n.settings === 'object' && !Array.isArray(n.settings)
          ? (n.settings as Record<string, unknown>)
          : {};
      found = Math.max(found, parseKitItemLimit(settings.limit, fallback, max));
    }
    if (Array.isArray(n.rows)) {
      n.rows.forEach(visit);
    }
    if (Array.isArray(n.columns)) {
      n.columns.forEach(visit);
    }
    if (Array.isArray(n.blocks)) {
      n.blocks.forEach(visit);
    }
  };
  (nodes ?? []).forEach(visit);
  return found > 0 ? found : fallback;
}
