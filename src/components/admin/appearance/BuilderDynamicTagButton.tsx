import { component$, useSignal, type JSXOutput, type QRL } from '@builder.io/qwik';
import type { DynamicTagCatalog } from '~/lib/admin/appearance-actions';
import { buildDynamicTagTree, type DynamicTagTreeNode } from '~/lib/admin/dynamic-tag-tree';
import { translateApp } from '~/lib/i18n/useTranslate';
import { DatabaseGlyph } from './InspectorGlyphs';

/** Group heading: translated by the last id segment (`project.categories` → `categories`), else the API label. */
function groupLabel(lang: string, node: DynamicTagTreeNode): string {
  const key = `appearance.dynamicTagGroups.${node.id.split('.').pop()}`;
  const translated = translateApp(lang, key);
  return translated !== key ? translated : node.label;
}

/**
 * Inline dynamic-tag trigger for the end of a text / URL / textarea input. The parent wrapper
 * must be `relative` and give the input end padding (`pe-8`). Picking a tag appends `{{id}}`.
 * Groups nest (content type → relation) and start folded; searching expands every match.
 */
export const BuilderDynamicTagButton = component$<{
  catalog: DynamicTagCatalog;
  lang: string;
  onInsert$: QRL<(token: string) => void>;
  /** Top-align the trigger (multi-line inputs). */
  top?: boolean;
}>((props) => {
  const open = useSignal(false);
  const query = useSignal('');
  const expanded = useSignal<Record<string, boolean>>({});
  if (!props.catalog.tags.length) return null;
  const t = (key: string) => translateApp(props.lang, `appearance.${key}`);
  const searching = query.value.trim() !== '';
  const tree = open.value ? buildDynamicTagTree(props.catalog, query.value) : [];
  const title = t('dynamicTagsInsert');

  const renderNode = (node: DynamicTagTreeNode, depth: number): JSXOutput => {
    const isOpen = searching || expanded.value[node.id] === true;
    const nodeId = node.id;
    return (
      <div key={nodeId} class={depth > 0 ? 'ms-2 border-s border-gray-100 ps-1 dark:border-gray-800' : ''}>
        {/* Group toggle */}
        <button
          type="button"
          class="flex w-full items-center gap-1 rounded px-2 py-1 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800"
          aria-expanded={isOpen}
          onClick$={() => {
            expanded.value = { ...expanded.value, [nodeId]: !expanded.value[nodeId] };
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            class={['shrink-0 transition-transform rtl:-scale-x-100', isOpen ? 'rotate-90 rtl:-rotate-90' : ''].join(' ')}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span class="truncate">{groupLabel(props.lang, node)}</span>
          <span class="ms-auto text-[10px] font-normal text-gray-400">{node.total}</span>
        </button>
        {isOpen ? (
          <div>
            {node.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                class="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 ps-6 text-start text-xs text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                onClick$={async () => {
                  open.value = false;
                  query.value = '';
                  await props.onInsert$(`{{${tag.id}}}`);
                }}
              >
                <span class="truncate">{tag.label}</span>
                <code class="shrink-0 truncate text-[10px] text-gray-400" dir="ltr">{`{{${tag.id}}}`}</code>
              </button>
            ))}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      class={[
        'absolute end-1',
        props.top ? 'top-1' : 'top-1/2 -translate-y-1/2',
        // The transform makes this a stacking context; lift it above later rows while the menu is open.
        open.value ? 'z-50' : '',
      ].join(' ')}
    >
      {/* Trigger: database glyph, like Elementor's dynamic tags button */}
      <button
        type="button"
        class={[
          'flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400',
          open.value ? 'bg-gray-100 text-primary-600 dark:bg-slate-800 dark:text-primary-400' : '',
        ].join(' ')}
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open.value}
        onClick$={() => {
          open.value = !open.value;
          query.value = '';
        }}
      >
        <DatabaseGlyph />
      </button>
      {open.value ? (
        <>
          {/* Click-away layer */}
          <div class="fixed inset-0 z-40" aria-hidden="true" onClick$={() => (open.value = false)} />
          {/* Tag picker: search + nested groups */}
          <div
            role="dialog"
            aria-label={title}
            class="absolute end-0 top-full z-50 mt-1 flex max-h-80 w-72 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-slate-900"
            window:onKeyDown$={(e) => {
              if ((e as KeyboardEvent).key === 'Escape') open.value = false;
            }}
          >
            {/* Search */}
            <div class="border-b border-gray-100 p-1.5 dark:border-gray-800">
              <input
                type="search"
                class="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                placeholder={t('dynamicTagsSearch')}
                aria-label={t('dynamicTagsSearch')}
                value={query.value}
                onInput$={(e) => {
                  query.value = (e.target as HTMLInputElement).value;
                }}
              />
            </div>
            {/* Groups */}
            <div class="overflow-y-auto p-1">
              {tree.length > 0 ? (
                tree.map((node) => renderNode(node, 0))
              ) : (
                <p class="px-2 py-3 text-center text-xs text-gray-400">{t('dynamicTagsNoMatch')}</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
});
