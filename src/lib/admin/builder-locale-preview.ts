/**
 * Builder canvas locale previews. Saved settings keep translations in `settings.translations`;
 * the public API flattens them per locale server-side, the builder does it here so the canvas
 * shows the language being edited.
 */
import type { PageLayoutBand, PageLayoutBlock } from '~/lib/marketing/appearance-types';
import { resolveAppearanceSettingsForLocale } from './appearance-locale-settings';

const localeCache = new WeakMap<PageLayoutBlock, { key: string; block: PageLayoutBlock }>();

/**
 * The block with settings resolved for `locale`. Cached per block + locale so unchanged canvas
 * blocks keep their identity and skip re-rendering.
 */
export function withBuilderLocalePreview(
  block: PageLayoutBlock,
  locale: string,
  defaultLocale: string,
): PageLayoutBlock {
  const key = `${locale}|${defaultLocale}`;
  const cached = localeCache.get(block);
  if (cached && cached.key === key) return cached.block;
  const settings = block.settings
    ? resolveAppearanceSettingsForLocale(block.settings as Record<string, unknown>, locale, defaultLocale)
    : block.settings;
  const innerRows = (block as { rows?: PageLayoutBand['rows'] }).rows;
  const rows = Array.isArray(innerRows) ? localizeRows(innerRows, locale, defaultLocale) : innerRows;
  const result = { ...block, settings, ...(rows !== innerRows ? { rows } : {}) } as PageLayoutBlock;
  localeCache.set(block, { key, block: result });
  return result;
}

function localizeRows(rows: PageLayoutBand['rows'], locale: string, defaultLocale: string): PageLayoutBand['rows'] {
  return rows.map((row) => ({
    ...row,
    columns: (row.columns ?? []).map((col) => ({
      ...col,
      blocks: (col.blocks ?? []).map((block) => withBuilderLocalePreview(block, locale, defaultLocale)),
    })),
  }));
}

/** Bands with every block resolved for `locale` (view mode renders whole bands). */
export function bandsWithBuilderLocalePreview(
  bands: PageLayoutBand[],
  locale: string,
  defaultLocale: string,
): PageLayoutBand[] {
  return bands.map((band) => ({ ...band, rows: localizeRows(band.rows ?? [], locale, defaultLocale) }));
}
