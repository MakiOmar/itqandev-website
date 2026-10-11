import { component$, useSignal, useTask$, type QRL } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { contentTypePluralLabel, searchBuilderLinksFromBrowser, type BuilderLinkResult } from '~/lib/admin/content-types';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError } from '~/lib/utils/toast';
import { LinkGlyph } from './InspectorGlyphs';

const SEARCH_DEBOUNCE_MS = 250;

type LinkGroup = { type: string; label: string; rows: BuilderLinkResult[] };

function groupByType(lang: string, rows: BuilderLinkResult[]): LinkGroup[] {
  const groups = new Map<string, LinkGroup>();
  for (const row of rows) {
    const group = groups.get(row.type) ?? {
      type: row.type,
      label: contentTypePluralLabel(lang, { key: row.type, plural_label: row.type_label }),
      rows: [],
    };
    group.rows.push(row);
    groups.set(row.type, group);
  }
  return [...groups.values()];
}

/**
 * Inline "link to content" trigger for builder URL inputs. Searches published records of every enabled
 * content type and replaces the value with the record's path (`/portfolio/slug/`); the public site adds
 * the visitor's locale and resolves it against its own origin. The parent wrapper must be `relative`;
 * `shifted` leaves room for a dynamic-tag button at the end edge.
 */
export const BuilderLinkSearchButton = component$<{
  lang: string;
  onPick$: QRL<(path: string) => void>;
  shifted?: boolean;
}>((props) => {
  const open = useSignal(false);
  const query = useSignal('');
  const loading = useSignal(false);
  const failed = useSignal(false);
  const results = useSignal<BuilderLinkResult[]>([]);
  const requestId = useSignal(0);
  const t = (key: string) => translateApp(props.lang, `appearance.linkSearch.${key}`);
  const title = t('open');

  useTask$(({ track, cleanup }) => {
    const term = track(() => query.value);
    const isOpen = track(() => open.value);
    if (isServer || !isOpen) return;
    const id = ++requestId.value;
    loading.value = true;
    const timer = setTimeout(async () => {
      try {
        const rows = await searchBuilderLinksFromBrowser(term);
        if (id !== requestId.value) return;
        results.value = rows;
        failed.value = false;
      } catch (error) {
        if (id !== requestId.value) return;
        console.error('Builder link search failed', error);
        failed.value = true;
        showError(translateApp(props.lang, 'appearance.linkSearch.error'));
      } finally {
        if (id === requestId.value) loading.value = false;
      }
    }, SEARCH_DEBOUNCE_MS);
    cleanup(() => clearTimeout(timer));
  });

  const groups = groupByType(props.lang, results.value);

  return (
    <div
      class={[
        'absolute top-1/2 -translate-y-1/2',
        props.shifted ? 'end-7' : 'end-1',
        // The transform makes this a stacking context; lift it above later rows while the menu is open.
        open.value ? 'z-50' : '',
      ].join(' ')}
    >
      {/* Trigger: chain glyph */}
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
        <LinkGlyph />
      </button>
      {open.value ? (
        <>
          {/* Click-away layer */}
          <div class="fixed inset-0 z-40" aria-hidden="true" onClick$={() => (open.value = false)} />
          {/* Content picker: search + results grouped by content type */}
          <div
            role="dialog"
            aria-label={title}
            class={[
              'absolute top-full z-50 mt-1 flex max-h-80 w-72 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-slate-900',
              // Align with the input's end edge like the dynamic-tag menu, so it stays inside the inspector.
              props.shifted ? '-end-6' : 'end-0',
            ].join(' ')}
            window:onKeyDown$={(e) => {
              if ((e as KeyboardEvent).key === 'Escape') open.value = false;
            }}
          >
            {/* Search */}
            <div class="border-b border-gray-100 p-1.5 dark:border-gray-800">
              <input
                type="search"
                class="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200"
                placeholder={t('search')}
                aria-label={t('search')}
                value={query.value}
                autoFocus
                onInput$={(e) => {
                  query.value = (e.target as HTMLInputElement).value;
                }}
              />
            </div>
            {/* Results */}
            <div class="overflow-y-auto p-1" aria-busy={loading.value}>
              {loading.value && !results.value.length ? (
                <p class="px-2 py-3 text-center text-xs text-gray-400">{t('loading')}</p>
              ) : failed.value ? (
                <p class="px-2 py-3 text-center text-xs text-red-500">{t('error')}</p>
              ) : groups.length ? (
                groups.map((group) => (
                  <div key={group.type}>
                    <p class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {group.label}
                    </p>
                    {group.rows.map((row) => (
                      <button
                        key={`${row.type}-${row.id}`}
                        type="button"
                        class="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 ps-4 text-start text-xs text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                        onClick$={async () => {
                          open.value = false;
                          query.value = '';
                          await props.onPick$(row.path);
                        }}
                      >
                        <span class="truncate">{row.title}</span>
                        <code class="shrink-0 truncate text-[10px] text-gray-400" dir="ltr">{row.path}</code>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <p class="px-2 py-3 text-center text-xs text-gray-400">{t('noMatch')}</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
});
