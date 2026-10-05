/**
 * Global widgets in the builder. A placement is stored as `{ kind: 'global', global_id }`; while
 * editing, the builder caches the global's type/settings/styles on the placement so the canvas and
 * inspector work as for any widget. Edits sync to the other placements of the same global and are
 * written back to the global on Save; the backend strips the cache when the page is saved.
 */
import type {
  AppearanceRegistryEntry,
  PageLayoutBand,
  PageLayoutBlock,
  PageLayoutRow,
} from '../marketing/appearance-types';
import type { BuilderStyles } from '../marketing/builder-styles';
import {
  isInnerBandBlock,
  layoutTreeKindAt,
  layoutTreeNodeAt,
  type LayoutTreePath,
} from './page-layout-tree';

export type GlobalWidgetDocument = {
  kind?: string;
  type: string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
  styles?: BuilderStyles;
};

export type GlobalWidgetEntry = { name: string; document: GlobalWidgetDocument };

/** Keyed by global id (string keys keep the map serializable across `$` boundaries). */
export type GlobalWidgetMap = Record<string, GlobalWidgetEntry>;

const UNRESOLVED_TYPE = 'global';

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export function isGlobalPlacement(block: PageLayoutBlock | null | undefined): boolean {
  return !!block && block.kind === 'global' && Number(block.global_id) > 0;
}

/** Content has been copied onto the placement, so it can render and be edited. */
export function isResolvedGlobalPlacement(block: PageLayoutBlock | null | undefined): boolean {
  return isGlobalPlacement(block) && block!.type !== UNRESOLVED_TYPE;
}

function mapRows(rows: PageLayoutRow[], fn: (b: PageLayoutBlock) => PageLayoutBlock): PageLayoutRow[] {
  return rows.map((row) => ({
    ...row,
    columns: row.columns.map((col) => ({
      ...col,
      blocks: col.blocks.map((block) => {
        const next = fn(block);
        return isInnerBandBlock(next) && next.rows ? { ...next, rows: mapRows(next.rows, fn) } : next;
      }),
    })),
  }));
}

function mapBlocks(bands: PageLayoutBand[], fn: (b: PageLayoutBlock) => PageLayoutBlock): PageLayoutBand[] {
  return bands.map((band) => ({ ...band, rows: mapRows(band.rows, fn) }));
}

function eachBlock(bands: PageLayoutBand[], fn: (b: PageLayoutBlock) => void): void {
  mapBlocks(bands, (b) => {
    fn(b);
    return b;
  });
}

export function linkedGlobalIds(bands: PageLayoutBand[]): number[] {
  const ids = new Set<number>();
  eachBlock(bands, (b) => {
    if (isGlobalPlacement(b)) ids.add(Number(b.global_id));
  });
  return [...ids];
}

function contentKey(block: Pick<PageLayoutBlock, 'type' | 'settings' | 'styles'>): string {
  return JSON.stringify([block.type, block.settings ?? {}, block.styles ?? null]);
}

/** Copies cached global content onto placements that still only hold the link; null when none changed. */
export function resolveGlobalPlacements(bands: PageLayoutBand[], globals: GlobalWidgetMap): PageLayoutBand[] | null {
  let changed = false;
  const next = mapBlocks(bands, (b) => {
    if (!isGlobalPlacement(b) || isResolvedGlobalPlacement(b)) return b;
    const entry = globals[String(b.global_id)];
    if (!entry) return b;
    changed = true;
    return {
      ...b,
      type: entry.document.type,
      settings: clone(entry.document.settings) ?? {},
      styles: clone(entry.document.styles),
    };
  });
  return changed ? next : null;
}

/** An edit to one placement is mirrored to every other placement of the same global. */
export function syncGlobalPlacements(prev: PageLayoutBand[], next: PageLayoutBand[]): PageLayoutBand[] {
  const before = new Map<string, string>();
  eachBlock(prev, (b) => {
    if (isResolvedGlobalPlacement(b)) before.set(b.id, contentKey(b));
  });
  const edited = new Map<number, PageLayoutBlock>();
  eachBlock(next, (b) => {
    if (!isResolvedGlobalPlacement(b)) return;
    const was = before.get(b.id);
    if (was !== undefined && was !== contentKey(b)) edited.set(Number(b.global_id), b);
  });
  if (edited.size === 0) return next;
  return mapBlocks(next, (b) => {
    const source = isGlobalPlacement(b) ? edited.get(Number(b.global_id)) : undefined;
    if (!source || source.id === b.id) return b;
    return { ...b, type: source.type, settings: clone(source.settings), styles: clone(source.styles) };
  });
}

/** Globals whose placement content differs from what was loaded, ready for `PUT /appearance/globals/{id}`. */
export function changedGlobalDocuments(
  bands: PageLayoutBand[],
  globals: GlobalWidgetMap,
): { id: number; document: GlobalWidgetDocument }[] {
  const out = new Map<number, GlobalWidgetDocument>();
  eachBlock(bands, (b) => {
    if (!isResolvedGlobalPlacement(b)) return;
    const id = Number(b.global_id);
    const entry = globals[String(id)];
    if (!entry || out.has(id) || contentKey(b) === contentKey(entry.document)) return;
    out.set(id, {
      ...entry.document,
      type: b.type,
      settings: clone(b.settings) ?? {},
      styles: clone(b.styles),
    });
  });
  return [...out].map(([id, document]) => ({ id, document }));
}

/** Leaf widgets and kits can become globals; layout nodes, inner bands and globals cannot. */
export function canSaveAsGlobal(bands: PageLayoutBand[], path: LayoutTreePath): boolean {
  if (layoutTreeKindAt(path.length) !== 'block') return false;
  const block = layoutTreeNodeAt(bands, path) as PageLayoutBlock | null;
  return !!block && !isInnerBandBlock(block) && !isGlobalPlacement(block) && block.type !== UNRESOLVED_TYPE;
}

export function globalDocumentFromBlock(block: PageLayoutBlock): GlobalWidgetDocument {
  return {
    kind: block.kind === 'kit' ? 'kit' : 'widget',
    type: block.type,
    enabled: true,
    settings: clone(block.settings) ?? {},
    ...(block.styles ? { styles: clone(block.styles) } : {}),
  };
}

export function updateBlockAtPath(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
  update: (block: PageLayoutBlock) => PageLayoutBlock,
): PageLayoutBand[] {
  const next = clone(bands);
  const parentPath = path.slice(0, -1);
  const column = layoutTreeNodeAt(next, parentPath) as { blocks?: PageLayoutBlock[] } | null;
  const index = path[path.length - 1];
  if (!column?.blocks?.[index]) return bands;
  column.blocks[index] = update(column.blocks[index]);
  return next;
}

export function linkBlockToGlobal(block: PageLayoutBlock, globalId: number): PageLayoutBlock {
  return { ...block, kind: 'global', global_id: globalId };
}

/** Detaches a placement into a regular widget holding the current global content. */
export function unlinkGlobalBlock(
  block: PageLayoutBlock,
  globals: GlobalWidgetMap,
  registry: AppearanceRegistryEntry[],
): PageLayoutBlock {
  const entryKind = globals[String(block.global_id)]?.document.kind;
  const registryKind = registry.find((r) => r.type === block.type)?.kind;
  const kind = entryKind === 'kit' || (!entryKind && registryKind === 'kit') ? 'kit' : 'widget';
  const next: PageLayoutBlock = { ...block, kind };
  delete next.global_id;
  return next;
}
