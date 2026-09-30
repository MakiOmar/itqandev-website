/**
 * Builder canvas media previews. Saved settings reference library images by id; the public API
 * swaps ids for URLs server-side, the builder does it here from one bulk lookup
 * (`GET /v1/media/lookup`) so the canvas matches the live page.
 */
import type {
  AppearanceRegistryEntry,
  AppearanceSettingField,
  PageLayoutBand,
  PageLayoutBlock,
} from '~/lib/marketing/appearance-types';

/** Media id → URL, keyed by the id as a string. */
export type MediaUrlMap = Record<string, string>;

type Settings = Record<string, unknown>;

/** Mirrors the backend `LookupMediaRequest::MAX_IDS`. */
export const MEDIA_LOOKUP_CHUNK = 200;

function mediaIdOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const id = Number(value.trim());
    return id > 0 ? id : null;
  }
  return null;
}

function settingBags(settings: Settings): Settings[] {
  const bags = [settings];
  const translations = settings.translations;
  if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
    for (const bag of Object.values(translations)) {
      if (bag && typeof bag === 'object' && !Array.isArray(bag)) bags.push(bag as Settings);
    }
  }
  return bags;
}

function collectFromSettings(settings: Settings, fields: AppearanceSettingField[], out: Set<number>): void {
  for (const bag of settingBags(settings)) {
    for (const field of fields) {
      const value = bag[field.key];
      if (field.type === 'media') {
        const id = mediaIdOf(value);
        if (id) out.add(id);
      } else if (field.type === 'repeater' && Array.isArray(value)) {
        for (const row of value) {
          if (row && typeof row === 'object') collectFromSettings(row as Settings, field.item_fields ?? [], out);
        }
      } else if (field.type === 'floating_icons' && Array.isArray(value)) {
        for (const icon of value) {
          const id = mediaIdOf((icon as Settings | null)?.media_id);
          if (id) out.add(id);
        }
      }
    }
  }
}

function eachBlock(bands: PageLayoutBand[], visit: (block: PageLayoutBlock) => void): void {
  const walkBlocks = (blocks: PageLayoutBlock[] | undefined) => {
    for (const block of blocks ?? []) {
      visit(block);
      const innerRows = (block as { rows?: PageLayoutBand['rows'] }).rows;
      if (Array.isArray(innerRows)) {
        for (const row of innerRows) for (const col of row.columns ?? []) walkBlocks(col.blocks);
      }
    }
  };
  for (const band of bands) {
    for (const row of band.rows ?? []) for (const col of row.columns ?? []) walkBlocks(col.blocks);
  }
}

/** Media ids referenced anywhere in the layout that are not in `known` yet. */
export function missingBuilderMediaIds(
  bands: PageLayoutBand[],
  registry: AppearanceRegistryEntry[],
  known: MediaUrlMap,
): number[] {
  const fieldsByType = new Map(registry.map((entry) => [entry.type, entry.settings_fields ?? []]));
  const ids = new Set<number>();
  eachBlock(bands, (block) => {
    const fields = fieldsByType.get(block.type);
    if (fields?.length && block.settings) collectFromSettings(block.settings as Settings, fields, ids);
  });
  return [...ids].filter((id) => !known[String(id)]);
}

function expandSettings(settings: Settings, fields: AppearanceSettingField[], urls: MediaUrlMap): Settings | null {
  let next: Settings | null = null;
  const set = (key: string, value: unknown) => {
    next ??= { ...settings };
    next[key] = value;
  };
  for (const field of fields) {
    const value = settings[field.key];
    if (field.type === 'media') {
      const id = mediaIdOf(value);
      const url = id ? urls[String(id)] : undefined;
      if (url) set(field.key, url);
    } else if (field.type === 'repeater' && Array.isArray(value)) {
      let changed = false;
      const rows = value.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const expanded = expandSettings(row as Settings, field.item_fields ?? [], urls);
        if (expanded) changed = true;
        return expanded ?? row;
      });
      if (changed) set(field.key, rows);
    } else if (field.type === 'floating_icons' && Array.isArray(value)) {
      let changed = false;
      const icons = value.map((icon) => {
        const row = icon as Settings | null;
        const id = mediaIdOf(row?.media_id);
        const url = id ? urls[String(id)] : undefined;
        if (!row || !url || row.url) return icon;
        changed = true;
        return { ...row, url };
      });
      if (changed) set(field.key, icons);
    }
  }
  const translations = settings.translations;
  if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
    let changed = false;
    const bags: Record<string, unknown> = {};
    for (const [locale, bag] of Object.entries(translations)) {
      const expanded = bag && typeof bag === 'object' ? expandSettings(bag as Settings, fields, urls) : null;
      if (expanded) changed = true;
      bags[locale] = expanded ?? bag;
    }
    if (changed) set('translations', bags);
  }
  return next;
}

const expandCache = new WeakMap<PageLayoutBlock, { urls: MediaUrlMap; block: PageLayoutBlock }>();

/**
 * The block with library ids swapped for URLs. Returns the same object when nothing changes and
 * caches per block + map, so unchanged canvas blocks keep their identity and skip re-rendering.
 */
export function withBuilderMediaPreview(
  block: PageLayoutBlock,
  registry: AppearanceRegistryEntry[],
  urls: MediaUrlMap,
): PageLayoutBlock {
  const cached = expandCache.get(block);
  if (cached && cached.urls === urls) return cached.block;

  const fields = registry.find((entry) => entry.type === block.type)?.settings_fields ?? [];
  const settings =
    fields.length && block.settings ? expandSettings(block.settings as Settings, fields, urls) : null;
  // Inner bands carry their own rows of blocks.
  const innerRows = (block as { rows?: PageLayoutBand['rows'] }).rows;
  const rows = Array.isArray(innerRows) ? expandRows(innerRows, registry, urls) : innerRows;

  const result =
    settings || rows !== innerRows
      ? ({ ...block, ...(settings ? { settings } : {}), ...(rows !== innerRows ? { rows } : {}) } as PageLayoutBlock)
      : block;
  expandCache.set(block, { urls, block: result });
  return result;
}

/** Rows with blocks expanded; returns the same array when no block changed. */
function expandRows(
  rows: PageLayoutBand['rows'],
  registry: AppearanceRegistryEntry[],
  urls: MediaUrlMap,
): PageLayoutBand['rows'] {
  let changed = false;
  const next = rows.map((row) => {
    let rowChanged = false;
    const columns = (row.columns ?? []).map((col) => {
      const blocks = (col.blocks ?? []).map((block) => withBuilderMediaPreview(block, registry, urls));
      if (!blocks.some((b, i) => b !== col.blocks?.[i])) return col;
      rowChanged = true;
      return { ...col, blocks };
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, columns };
  });
  return changed ? next : rows;
}

/** Bands with every block expanded (view mode renders whole bands). */
export function bandsWithBuilderMediaPreview(
  bands: PageLayoutBand[],
  registry: AppearanceRegistryEntry[],
  urls: MediaUrlMap,
): PageLayoutBand[] {
  return bands.map((band) => {
    const rows = expandRows(band.rows ?? [], registry, urls);
    return rows === band.rows ? band : { ...band, rows };
  });
}
