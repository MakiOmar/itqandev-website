/**
 * Responsive grid column helpers for marketing kit card grids.
 * Static Tailwind class maps so JIT includes every variant.
 */

export type ResponsiveColumns = {
  mobile: number;
  tablet: number;
  desktop: number;
};

export const DEFAULT_WORKS_COLUMNS: ResponsiveColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 2,
};

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const MD_GRID_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

const LG_GRID_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function clampGridColumns(n: unknown, fallback = 1): number {
  const value = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 4) return 4;
  return rounded;
}

export function normalizeResponsiveColumns(raw: unknown): ResponsiveColumns {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_WORKS_COLUMNS };
  }
  const row = raw as Record<string, unknown>;
  const desktop = clampGridColumns(row.desktop ?? row.lg, DEFAULT_WORKS_COLUMNS.desktop);
  const tablet = clampGridColumns(row.tablet ?? row.md, desktop);
  const mobile = clampGridColumns(row.mobile ?? row.sm, DEFAULT_WORKS_COLUMNS.mobile);
  return { mobile, tablet, desktop };
}

/** Tailwind grid column classes for mobile / tablet / desktop breakpoints. */
export function gridColumnClassNames(columns: ResponsiveColumns): string {
  const mobile = clampGridColumns(columns.mobile);
  const tablet = clampGridColumns(columns.tablet);
  const desktop = clampGridColumns(columns.desktop);
  return [
    'grid',
    GRID_COLS[mobile] ?? GRID_COLS[1],
    MD_GRID_COLS[tablet] ?? MD_GRID_COLS[mobile] ?? MD_GRID_COLS[1],
    LG_GRID_COLS[desktop] ?? LG_GRID_COLS[tablet] ?? LG_GRID_COLS[1],
  ].join(' ');
}

export const GRID_COLUMN_OPTIONS = [1, 2, 3, 4] as const;
