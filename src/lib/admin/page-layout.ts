/**
 * CMS Pages layout helpers (band → row → column → block).
 * Keep functions module-level so Qwik `$` handlers can call them safely.
 */

import type {
  AppearanceRegistryEntry,
  HomepageSectionInstance,
  PageLayoutBand,
  PageLayoutBlock,
  PageSectionNode,
} from '../marketing/appearance-types';
import { FULL_COLUMN_SPANS } from '../marketing/appearance-types';
import {
  clampSpan,
  isPageLayoutBand,
  normalizeColumnSpans,
} from '../marketing/page-layout-utils';
import { collectAppearanceMediaIdsFromSettings } from './appearance-media-ref';
import { canInsertType, countByType, newBlockId, newColumnId } from './appearance-actions';

export {
  clampSpan,
  columnSpanClassNames,
  isPageLayoutBand,
  normalizeColumnSpans,
} from '../marketing/page-layout-utils';

export function newRowId(): string {
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

export function newBandId(): string {
  return `band_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensurePageLayoutBands(sections: PageSectionNode[]): PageLayoutBand[] {
  return sections.map((node) => {
    if (isPageLayoutBand(node)) {
      return {
        ...node,
        type: 'layout',
        rows: (node.rows ?? []).map((row) => ({
          ...row,
          columns: (row.columns ?? []).map((col) => ({
            ...col,
            span: normalizeColumnSpans(col.span),
            blocks: col.blocks ?? [],
          })),
        })),
      };
    }
    return wrapLegacySectionAsBand(node);
  });
}

export function wrapLegacySectionAsBand(section: HomepageSectionInstance): PageLayoutBand {
  return {
    id: newBandId(),
    type: 'layout',
    enabled: section.enabled !== false,
    layout_width: section.layout_width ?? (section.type === 'hero' ? 'full' : 'boxed'),
    settings: {},
    rows: [
      {
        id: newRowId(),
        stack_below: 'none',
        gap: 4,
        columns: [
          {
            id: newColumnId(),
            span: { ...FULL_COLUMN_SPANS },
            blocks: [
              {
                id: section.id || newBlockId(String(section.type)),
                type: section.type,
                enabled: section.enabled !== false,
                settings: { ...(section.settings ?? {}) },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function createBandWithBlock(
  registry: AppearanceRegistryEntry[],
  type: string,
): PageLayoutBand | null {
  const entry = registry.find((r) => r.type === type);
  if (!entry) return null;
  return {
    id: newBandId(),
    type: 'layout',
    enabled: true,
    layout_width: type === 'hero' ? 'full' : 'boxed',
    settings: {},
    rows: [
      {
        id: newRowId(),
        stack_below: 'none',
        gap: 4,
        columns: [
          {
            id: newColumnId(),
            span: { ...FULL_COLUMN_SPANS },
            blocks: [
              {
                id: newBlockId(type),
                type,
                enabled: true,
                settings: { ...(entry.default_settings ?? {}) },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function createEmptyBand(): PageLayoutBand {
  return {
    id: newBandId(),
    type: 'layout',
    enabled: true,
    layout_width: 'boxed',
    settings: {},
    rows: [
      {
        id: newRowId(),
        stack_below: 'none',
        gap: 4,
        columns: [
          {
            id: newColumnId(),
            span: { ...FULL_COLUMN_SPANS },
            blocks: [],
          },
        ],
      },
    ],
  };
}

export function createEmptyColumn(equalShare = 12): PageLayoutColumn {
  const n = clampSpan(equalShare);
  return {
    id: newColumnId(),
    span: { mobile: 12, tablet: n, desktop: n },
    blocks: [],
  };
}

export function createEmptyRow(columnCount = 2): PageLayoutRow {
  const n = Math.max(1, Math.min(4, columnCount));
  const share = Math.floor(12 / n);
  return {
    id: newRowId(),
    stack_below: 'tablet',
    gap: 4,
    columns: Array.from({ length: n }, () => createEmptyColumn(share)),
  };
}

export function countBlocksByType(bands: PageLayoutBand[]): Record<string, number> {
  const blocks: { type: string }[] = [];
  for (const band of bands) {
    for (const row of band.rows ?? []) {
      for (const col of row.columns ?? []) {
        for (const block of col.blocks ?? []) {
          blocks.push(block);
        }
      }
    }
  }
  return countByType(blocks);
}

export function canInsertBlockType(
  bands: PageLayoutBand[],
  registry: AppearanceRegistryEntry[],
  type: string,
): boolean {
  const entry = registry.find((r) => r.type === type);
  if (!entry) return false;
  return canInsertType(type, countBlocksByType(bands), entry.max_instances);
}

export function mapPageLayoutBands(
  bands: PageLayoutBand[],
  mapBand: (band: PageLayoutBand, bandIndex: number) => PageLayoutBand,
): PageLayoutBand[] {
  return bands.map(mapBand);
}

export function updateBlockInBands(
  bands: PageLayoutBand[],
  blockId: string,
  updater: (block: PageLayoutBlock) => PageLayoutBlock,
): PageLayoutBand[] {
  return bands.map((band) => ({
    ...band,
    rows: band.rows.map((row) => ({
      ...row,
      columns: row.columns.map((col) => ({
        ...col,
        blocks: col.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
      })),
    })),
  }));
}

export function patchBlockSettingsInBands(
  bands: PageLayoutBand[],
  blockId: string,
  settings: Record<string, unknown>,
): PageLayoutBand[] {
  return updateBlockInBands(bands, blockId, (block) => ({ ...block, settings }));
}

export function collectAppearanceMediaIdsFromPageSections(
  sections: PageSectionNode[],
): number[] {
  const ids = new Set<number>();
  for (const node of ensurePageLayoutBands(sections)) {
    for (const id of collectAppearanceMediaIdsFromSettings(node.settings)) {
      ids.add(id);
    }
    for (const row of node.rows) {
      for (const col of row.columns) {
        for (const block of col.blocks) {
          for (const id of collectAppearanceMediaIdsFromSettings(block.settings)) {
            ids.add(id);
          }
        }
      }
    }
  }
  return Array.from(ids);
}

export function writeMediaIntoPageSections(
  sections: PageSectionNode[],
  blockId: string,
  key: string,
  mediaId: number,
  locale: string,
  defaultLocale: string,
  writeSetting: (
    settings: Record<string, unknown>,
    key: string,
    value: unknown,
    locale: string,
    defaultLocale: string,
    translatable: boolean,
  ) => Record<string, unknown>,
  translatable: boolean,
): PageSectionNode[] {
  const bands = ensurePageLayoutBands(sections);
  return updateBlockInBands(bands, blockId, (block) => ({
    ...block,
    settings: writeSetting(block.settings ?? {}, key, mediaId, locale, defaultLocale, translatable),
  }));
}

export function findBlockInBands(
  bands: PageLayoutBand[],
  blockId: string,
): PageLayoutBlock | null {
  for (const band of bands) {
    for (const row of band.rows) {
      for (const col of row.columns) {
        for (const block of col.blocks) {
          if (block.id === blockId) return block;
        }
      }
    }
  }
  return null;
}

export type { LayoutBreakpoint } from '../marketing/appearance-types';
