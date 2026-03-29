import { component$, useSignal, useVisibleTask$, useStore } from '@builder.io/qwik';
import type { SiteLanguageRow } from '../../types/site-language';

function hasAnyContent(
  row: Record<string, string> | undefined,
  kind: 'project' | 'blog',
): boolean {
  if (!row) {
    return false;
  }
  if (kind === 'project') {
    return !!(row.title?.trim() || row.summary?.trim() || row.description?.trim());
  }
  return !!(row.title?.trim() || row.excerpt?.trim() || row.content?.trim());
}

function serializeRows(
  kind: 'project' | 'blog',
  locales: SiteLanguageRow[],
  store: Record<string, Record<string, string>>,
): string {
  const arr = locales.map((l) => {
    const r = store[l.code] || {};
    if (kind === 'project') {
      return {
        locale: l.code,
        title: r.title ?? '',
        summary: r.summary ?? '',
        description: r.description ?? '',
      };
    }
    return {
      locale: l.code,
      title: r.title ?? '',
      excerpt: r.excerpt ?? '',
      content: r.content ?? '',
    };
  });
  return JSON.stringify(arr);
}

export interface ContentTranslationsLabels {
  addTranslations: string;
  collapseTranslations: string;
  sectionTitle: string;
  defaultHint: string;
  noLanguages: string;
  title: string;
  summary: string;
  description: string;
  excerpt: string;
  content: string;
  rtlBadge: string;
}

export const ContentTranslationsPanel = component$<{
  kind: 'project' | 'blog';
  locales: SiteLanguageRow[];
  initialJson: string;
  labels: ContentTranslationsLabels;
  /** Form field name for the JSON payload */
  name?: string;
}>((props) => {
  const fieldName = props.name ?? 'translations_json';
  const expanded = useSignal(false);
  const hiddenJson = useSignal(props.initialJson);
  const store = useStore<Record<string, Record<string, string>>>({});

  // eslint-disable-next-line qwik/no-use-visible-task -- hydrate row state from JSON; keep hidden in sync
  useVisibleTask$(({ track }) => {
    track(() => props.initialJson);
    track(() => props.locales);
    track(() => props.kind);

    let parsed: unknown[] = [];
    try {
      const raw = JSON.parse(props.initialJson) as unknown;
      if (Array.isArray(raw)) {
        parsed = raw;
      }
    } catch {
      parsed = [];
    }

    for (const l of props.locales) {
      const row = parsed.find(
        (x: unknown) =>
          typeof x === 'object' &&
          x !== null &&
          String((x as { locale?: string }).locale).toLowerCase() === l.code.toLowerCase(),
      ) as Record<string, unknown> | undefined;

      if (props.kind === 'project') {
        store[l.code] = {
          title: row?.title != null ? String(row.title) : '',
          summary: row?.summary != null ? String(row.summary) : '',
          description: row?.description != null ? String(row.description) : '',
        };
      } else {
        store[l.code] = {
          title: row?.title != null ? String(row.title) : '',
          excerpt: row?.excerpt != null ? String(row.excerpt) : '',
          content: row?.content != null ? String(row.content) : '',
        };
      }
    }

    hiddenJson.value = serializeRows(props.kind, props.locales, store);
    expanded.value = props.locales.some((loc) => hasAnyContent(store[loc.code], props.kind));
  });

  if (!props.locales.length) {
    return (
      <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
        <p>{props.labels.noLanguages}</p>
      </div>
    );
  }

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <input type="hidden" name={fieldName} value={hiddenJson.value} />

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{props.labels.sectionTitle}</h3>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{props.labels.defaultHint}</p>
        </div>
        <button
          type="button"
          onClick$={() => {
            expanded.value = !expanded.value;
          }}
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {expanded.value ? props.labels.collapseTranslations : props.labels.addTranslations}
        </button>
      </div>

      {expanded.value && (
        <div class="mt-4 space-y-6 border-t border-gray-200 pt-4 dark:border-gray-700">
          {props.locales.map((loc) => (
            <div
              key={loc.code}
              class="rounded-md border border-gray-100 p-3 dark:border-gray-800"
            >
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {loc.native_label || loc.label} ({loc.code})
                </span>
                {loc.rtl ? (
                  <span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                    {props.labels.rtlBadge}
                  </span>
                ) : null}
              </div>

              <div class="grid gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {props.labels.title}
                  </label>
                  <input
                    type="text"
                    value={store[loc.code]?.title ?? ''}
                    onInput$={(e) => {
                      const el = e.target as HTMLInputElement;
                      if (!store[loc.code]) {
                        store[loc.code] = {};
                      }
                      store[loc.code].title = el.value;
                      hiddenJson.value = serializeRows(props.kind, props.locales, store);
                    }}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>

                {props.kind === 'project' ? (
                  <>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                        {props.labels.summary}
                      </label>
                      <textarea
                        rows={2}
                        value={store[loc.code]?.summary ?? ''}
                        onInput$={(e) => {
                          const el = e.target as HTMLTextAreaElement;
                          if (!store[loc.code]) {
                            store[loc.code] = {};
                          }
                          store[loc.code].summary = el.value;
                          hiddenJson.value = serializeRows(props.kind, props.locales, store);
                        }}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                        {props.labels.description}
                      </label>
                      <textarea
                        rows={4}
                        value={store[loc.code]?.description ?? ''}
                        onInput$={(e) => {
                          const el = e.target as HTMLTextAreaElement;
                          if (!store[loc.code]) {
                            store[loc.code] = {};
                          }
                          store[loc.code].description = el.value;
                          hiddenJson.value = serializeRows(props.kind, props.locales, store);
                        }}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                        {props.labels.excerpt}
                      </label>
                      <textarea
                        rows={2}
                        value={store[loc.code]?.excerpt ?? ''}
                        onInput$={(e) => {
                          const el = e.target as HTMLTextAreaElement;
                          if (!store[loc.code]) {
                            store[loc.code] = {};
                          }
                          store[loc.code].excerpt = el.value;
                          hiddenJson.value = serializeRows(props.kind, props.locales, store);
                        }}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                        {props.labels.content}
                      </label>
                      <textarea
                        rows={8}
                        value={store[loc.code]?.content ?? ''}
                        onInput$={(e) => {
                          const el = e.target as HTMLTextAreaElement;
                          if (!store[loc.code]) {
                            store[loc.code] = {};
                          }
                          store[loc.code].content = el.value;
                          hiddenJson.value = serializeRows(props.kind, props.locales, store);
                        }}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
