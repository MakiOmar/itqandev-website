import { component$, useSignal, useOnWindow, useVisibleTask$, $, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { PageBuilderSelection } from './PageBuilderWorkspace';
import type { PageLayoutBand } from '~/lib/marketing/appearance-types';
import {
  canDropLayoutTreeNode,
  flattenLayoutTree,
  layoutTreePathKey,
  type LayoutTreeDropPosition,
  type LayoutTreeFlatNode,
  type LayoutTreePath,
} from '~/lib/admin/page-layout-tree';

export type PageBuilderNavigatorProps = {
  lang: string;
  bands: PageLayoutBand[];
  selection: PageBuilderSelection;
  onSelect$: QRL<(next: PageBuilderSelection) => void>;
  onMove$: QRL<(from: LayoutTreePath, to: LayoutTreePath, position: LayoutTreeDropPosition) => void>;
  onClose$: QRL<() => void>;
};

type NavigatorDropState = { key: string; position: LayoutTreeDropPosition };

const NAV_DND = 'application/x-credocode-navigator';

/**
 * Modal outline of the band → row → column → block tree. Nodes can be dragged to
 * reorder siblings or move into another container (rows, columns, inner bands).
 */
export const PageBuilderNavigator = component$<PageBuilderNavigatorProps>((props) => {
  const dragKey = useSignal<string | null>(null);
  const drop = useSignal<NavigatorDropState | null>(null);
  const dialogRef = useSignal<HTMLElement>();

  const nodes = flattenLayoutTree(props.bands, {
    band: translateApp(props.lang, 'pages.band'),
    row: translateApp(props.lang, 'pages.row'),
    column: translateApp(props.lang, 'pages.column'),
    block: '',
  });
  const selectedKey = selectionPathKey(props.selection);
  const siblingKeys = new Set(nodes.map((n) => layoutTreePathKey(n.path)));

  useOnWindow(
    'keydown',
    $((e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') props.onClose$();
    }),
  );

  useVisibleTask$(() => {
    dialogRef.value?.focus();
  });

  const clearDrag = $(() => {
    dragKey.value = null;
    drop.value = null;
  });

  return (
    <div
      class="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-20"
      onClick$={(e, el) => {
        if (e.target === el) props.onClose$();
      }}
    >
      {/* Navigator dialog */}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-builder-navigator-title"
        tabIndex={-1}
        class="flex max-h-[75vh] w-full max-w-md flex-col rounded-xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-slate-900"
      >
        <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h2 id="page-builder-navigator-title" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(props.lang, 'pages.navigator')}
            </h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {translateApp(props.lang, 'pages.navigatorHint')}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100"
            aria-label={translateApp(props.lang, 'common.close')}
            onClick$={() => props.onClose$()}
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </header>

        <nav
          class="min-h-0 flex-1 overflow-y-auto p-2 text-xs"
          aria-label={translateApp(props.lang, 'pages.navigator')}
        >
          {nodes.length === 0 ? (
            <p class="px-2 py-6 text-center text-gray-500 dark:text-gray-400">
              {translateApp(props.lang, 'pages.sectionsEmptyTitle')}
            </p>
          ) : (
            <ul role="tree" class="space-y-0.5">
              {nodes.map((node) => {
                const pathKey = layoutTreePathKey(node.path);
                const last = node.path[node.path.length - 1];
                const prevPath = last > 0 ? [...node.path.slice(0, -1), last - 1] : null;
                const nextPath = [...node.path.slice(0, -1), last + 1];
                const hasNext = siblingKeys.has(layoutTreePathKey(nextPath));
                const dropHere = drop.value?.key === pathKey ? drop.value.position : null;
                return (
                  <li
                    key={`${node.key}-${pathKey}`}
                    role="treeitem"
                    aria-level={node.depth + 1}
                    aria-selected={selectedKey === pathKey ? 'true' : 'false'}
                    draggable={true}
                    preventdefault:dragover
                    preventdefault:drop
                    class={nodeRowClass(node, dragKey.value === pathKey, dropHere)}
                    style={{ paddingInlineStart: `${node.depth * 14 + 4}px` }}
                    onDragStart$={(e) => {
                      e.stopPropagation();
                      dragKey.value = pathKey;
                      const dt = e.dataTransfer;
                      if (dt) {
                        dt.effectAllowed = 'move';
                        dt.setData(NAV_DND, pathKey);
                        dt.setData('text/plain', pathKey);
                      }
                    }}
                    onDragEnd$={clearDrag}
                    onDragOver$={(e, el) => {
                      const from = dragKey.value;
                      if (!from || from === pathKey) {
                        drop.value = null;
                        return;
                      }
                      const position = dropPositionFor(e as DragEvent, el, node);
                      if (drop.value?.key === pathKey && drop.value.position === position) return;
                      const ok = canDropLayoutTreeNode(props.bands, parsePathKey(from), node.path, position);
                      drop.value = ok ? { key: pathKey, position } : null;
                    }}
                    onDragLeave$={(e, el) => {
                      const related = (e as DragEvent).relatedTarget as Node | null;
                      if (related && el.contains(related)) return;
                      if (drop.value?.key === pathKey) drop.value = null;
                    }}
                    onDrop$={async () => {
                      const from = dragKey.value;
                      const target = drop.value;
                      await clearDrag();
                      if (!from || !target || target.key !== pathKey) return;
                      await props.onMove$(parsePathKey(from), node.path, target.position);
                    }}
                  >
                    <span class="cursor-grab text-gray-400 dark:text-gray-500" aria-hidden="true">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 16a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      class={labelClass(selectedKey === pathKey)}
                      onClick$={() => props.onSelect$(navigatorPathToSelection(node.path))}
                    >
                      {node.label}
                    </button>
                    <span class="flex flex-shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        class="rounded p-0.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-slate-700"
                        aria-label={translateApp(props.lang, 'pages.navigatorMoveUp')}
                        title={translateApp(props.lang, 'pages.navigatorMoveUp')}
                        disabled={!prevPath}
                        onClick$={() => {
                          if (prevPath) props.onMove$(node.path, prevPath, 'before');
                        }}
                      >
                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 5l6 7H4l6-7Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="rounded p-0.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-slate-700"
                        aria-label={translateApp(props.lang, 'pages.navigatorMoveDown')}
                        title={translateApp(props.lang, 'pages.navigatorMoveDown')}
                        disabled={!hasNext}
                        onClick$={() => {
                          if (hasNext) props.onMove$(node.path, nextPath, 'after');
                        }}
                      >
                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 15l-6-7h12l-6 7Z" />
                        </svg>
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </section>
    </div>
  );
});

function parsePathKey(key: string): LayoutTreePath {
  return key.split('.').map((v) => Number(v));
}

/** Top/bottom quarter = sibling insert; middle = drop inside when the node is a container. */
function dropPositionFor(
  e: DragEvent,
  el: Element,
  node: LayoutTreeFlatNode,
): LayoutTreeDropPosition {
  const rect = el.getBoundingClientRect();
  const ratio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
  if (!node.container) return ratio < 0.5 ? 'before' : 'after';
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'inside';
}

/** Nested inner-band nodes select their nearest editable ancestor (depth ≤ 4). */
export function navigatorPathToSelection(path: LayoutTreePath): PageBuilderSelection {
  const p = path.slice(0, 4);
  if (p.length === 1) return { kind: 'band', bandIndex: p[0] };
  if (p.length === 2) return { kind: 'row', bandIndex: p[0], rowIndex: p[1] };
  if (p.length === 3) return { kind: 'column', bandIndex: p[0], rowIndex: p[1], colIndex: p[2] };
  return { kind: 'block', bandIndex: p[0], rowIndex: p[1], colIndex: p[2], blockIndex: p[3] };
}

function selectionPathKey(sel: PageBuilderSelection): string | null {
  if (!sel) return null;
  if (sel.kind === 'band') return `${sel.bandIndex}`;
  if (sel.kind === 'row') return `${sel.bandIndex}.${sel.rowIndex}`;
  if (sel.kind === 'column') return `${sel.bandIndex}.${sel.rowIndex}.${sel.colIndex}`;
  return `${sel.bandIndex}.${sel.rowIndex}.${sel.colIndex}.${sel.blockIndex}`;
}

function nodeRowClass(
  node: LayoutTreeFlatNode,
  dragging: boolean,
  dropHere: LayoutTreeDropPosition | null,
): string {
  return [
    'flex items-center gap-1 rounded border-y-2 border-transparent pe-1',
    node.kind === 'band' ? 'mt-1 font-semibold' : '',
    dragging ? 'opacity-40' : '',
    dropHere === 'before' ? '!border-t-primary-500' : '',
    dropHere === 'after' ? '!border-b-primary-500' : '',
    dropHere === 'inside' ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-950/40' : '',
  ].join(' ');
}

function labelClass(active: boolean): string {
  return [
    'min-w-0 flex-1 truncate rounded px-1.5 py-1 text-start',
    active
      ? 'bg-primary-600 text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800',
  ].join(' ');
}
