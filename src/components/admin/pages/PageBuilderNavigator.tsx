import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { PageBuilderSelection } from './PageBuilderWorkspace';
import type { PageLayoutBand } from '~/lib/marketing/appearance-types';

export type PageBuilderNavigatorProps = {
  lang: string;
  bands: PageLayoutBand[];
  selection: PageBuilderSelection;
  onSelect$: QRL<(next: PageBuilderSelection) => void>;
};

/**
 * Outline of the band → row → column → leaf tree (editor navigator).
 */
export const PageBuilderNavigator = component$<PageBuilderNavigatorProps>((props) => {
  return (
    <aside class="flex w-52 flex-shrink-0 flex-col border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
      <div class="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
        {translateApp(props.lang, 'pages.navigator')}
      </div>
      <nav class="min-h-0 flex-1 overflow-y-auto p-2 text-xs" aria-label={translateApp(props.lang, 'pages.navigator')}>
        {props.bands.length === 0 ? (
          <p class="px-1 text-gray-500">{translateApp(props.lang, 'pages.sectionsEmptyTitle')}</p>
        ) : (
          <ul class="space-y-1">
            {props.bands.map((band, bandIndex) => (
              <li key={band.id}>
                <button
                  type="button"
                  class={navBtn(props.selection?.kind === 'band' && props.selection.bandIndex === bandIndex)}
                  onClick$={() => props.onSelect$({ kind: 'band', bandIndex })}
                >
                  {translateApp(props.lang, 'pages.band')} {bandIndex + 1}
                </button>
                <ul class="ms-2 mt-0.5 space-y-0.5 border-s border-gray-200 ps-2 dark:border-gray-700">
                  {(band.rows ?? []).map((row, rowIndex) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        class={navBtn(
                          props.selection?.kind === 'row' &&
                            props.selection.bandIndex === bandIndex &&
                            props.selection.rowIndex === rowIndex,
                        )}
                        onClick$={() => props.onSelect$({ kind: 'row', bandIndex, rowIndex })}
                      >
                        {translateApp(props.lang, 'pages.row')} {rowIndex + 1}
                      </button>
                      <ul class="ms-2 mt-0.5 space-y-0.5">
                        {(row.columns ?? []).map((col, colIndex) => (
                          <li key={col.id}>
                            <button
                              type="button"
                              class={navBtn(
                                props.selection?.kind === 'column' &&
                                  props.selection.bandIndex === bandIndex &&
                                  props.selection.rowIndex === rowIndex &&
                                  props.selection.colIndex === colIndex,
                              )}
                              onClick$={() =>
                                props.onSelect$({ kind: 'column', bandIndex, rowIndex, colIndex })
                              }
                            >
                              Col {colIndex + 1}
                            </button>
                            <ul class="ms-2 space-y-0.5">
                              {(col.blocks ?? []).map((block, blockIndex) => (
                                <li key={block.id}>
                                  <button
                                    type="button"
                                    class={navBtn(
                                      props.selection?.kind === 'block' &&
                                        props.selection.bandIndex === bandIndex &&
                                        props.selection.rowIndex === rowIndex &&
                                        props.selection.colIndex === colIndex &&
                                        props.selection.blockIndex === blockIndex,
                                    )}
                                    onClick$={() =>
                                      props.onSelect$({
                                        kind: 'block',
                                        bandIndex,
                                        rowIndex,
                                        colIndex,
                                        blockIndex,
                                      })
                                    }
                                  >
                                    {block.type}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
});

function navBtn(active: boolean): string {
  return [
    'w-full truncate rounded px-1.5 py-0.5 text-start',
    active
      ? 'bg-primary-600 text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800',
  ].join(' ');
}
