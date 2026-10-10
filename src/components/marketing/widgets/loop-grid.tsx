import type { PageLayoutBand, PageSectionNode } from '~/lib/marketing/appearance-types';
import { isPageLayoutBand } from '~/lib/marketing/page-layout-utils';

/** One record presented by the backend `LoopQueryService` for a `loop_grid` widget. */
export type LoopGridItem = {
  id?: number;
  title?: string;
  excerpt?: string;
  url?: string;
  date?: string;
  /** Loop item layout with tags already resolved for this record (node ids suffixed per record). */
  layout?: { sections?: PageSectionNode[] };
};

export function loopGridItems(settings: Record<string, unknown>): LoopGridItem[] {
  return Array.isArray(settings.items) ? (settings.items as LoopGridItem[]) : [];
}

export function loopGridClass(mode: unknown): string {
  return mode === 'carousel' ? 'flex gap-4 overflow-x-auto' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
}

/** Carousel cells need a fixed width; grid cells size from the template. */
export function loopGridCellClass(mode: unknown): string {
  return mode === 'carousel' ? 'w-72 shrink-0' : 'min-w-0';
}

/** Bands of the record's loop item layout, rendered full-width inside the grid cell. */
export function loopItemBands(item: LoopGridItem): PageLayoutBand[] {
  return (item.layout?.sections ?? [])
    .filter(isPageLayoutBand)
    .map((band) => ({ ...(band as PageLayoutBand), layout_width: 'full' as const }));
}

/** Built-in card used when no loop item layout is chosen (or it is unpublished). */
export const LoopGridCard = (props: { item: LoopGridItem; class?: string }) => (
  <a
    href={String(props.item.url || '#')}
    class={`block rounded-xl border border-slate-200 p-4 hover:border-primary-400 dark:border-slate-700 ${props.class ?? ''}`}
  >
    <h3 class="font-semibold text-slate-900 dark:text-white">{String(props.item.title || '')}</h3>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{String(props.item.excerpt || '')}</p>
  </a>
);
