import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { auth } from '../../../../../lib/auth';
import { routesFromPreferredCookie } from '../../../../../lib/constants/routes';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import {
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';
import {
  applySearchReplaceFromBrowser,
  fetchSearchReplaceTablesFromBrowser,
  previewSearchReplaceFromBrowser,
  type SearchReplaceResult,
  type SearchReplaceTable,
} from '../../../../../lib/admin/search-replace-actions';

function canAccessTools(session: { user: { permissions?: string[]; role: string } } | null): boolean {
  if (!session?.user) {
    return false;
  }
  const perms = session.user.permissions ?? [];
  if (perms.includes('manage system')) {
    return true;
  }
  return session.user.role === 'super_admin' || session.user.role === 'admin';
}

export const useSearchReplaceAccess = routeLoader$(async ({ cookie, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  const session = await auth.getSession(cookie);
  if (!canAccessTools(session)) {
    throw redirectFn(302, R.ADMIN.HOME);
  }
  return { ok: true as const };
});

/**
 * Admin Tools: database Search & Replace across selected tables.
 */
export default component$(() => {
  useSearchReplaceAccess();
  const { lang } = useTranslate();
  const { confirm, success, error: showError } = useSwal();

  const loading = useSignal(true);
  const busy = useSignal(false);
  const tables = useSignal<SearchReplaceTable[]>([]);
  const selected = useSignal<Record<string, boolean>>({});
  const findText = useSignal('');
  const replaceText = useSignal('');
  const dryRun = useSignal(true);
  const caseSensitive = useSignal(false);
  const ignoreSlugs = useSignal(true);
  const confirmPhrase = useSignal('CONFIRM');
  const driver = useSignal('');
  const result = useSignal<SearchReplaceResult | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const res = await fetchSearchReplaceTablesFromBrowser();
      tables.value = res.data ?? [];
      confirmPhrase.value = res.meta?.confirm_phrase || 'CONFIRM';
      driver.value = res.meta?.driver || '';
      const next: Record<string, boolean> = {};
      for (const t of tables.value) {
        next[t.name] = true;
      }
      selected.value = next;
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'tools.searchReplace.loadFailed'),
      });
    } finally {
      loading.value = false;
    }
  });

  const checkAll$ = $(() => {
    const next: Record<string, boolean> = {};
    for (const t of tables.value) {
      next[t.name] = true;
    }
    selected.value = next;
  });

  const uncheckAll$ = $(() => {
    const next: Record<string, boolean> = {};
    for (const t of tables.value) {
      next[t.name] = false;
    }
    selected.value = next;
  });

  const runPreview$ = $(async () => {
    const find = findText.value.trim();
    if (!find) {
      await showError(translateApp(lang, 'common.error'), {
        text: translateApp(lang, 'tools.searchReplace.findRequired'),
      });
      return;
    }
    const names = Object.entries(selected.value)
      .filter(([, on]) => on)
      .map(([name]) => name);
    if (names.length === 0) {
      await showError(translateApp(lang, 'common.error'), {
        text: translateApp(lang, 'tools.searchReplace.tablesRequired'),
      });
      return;
    }

    busy.value = true;
    try {
      result.value = await previewSearchReplaceFromBrowser({
        find,
        tables: names,
        case_sensitive: caseSensitive.value,
        ignore_slugs: ignoreSlugs.value,
      });
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'tools.searchReplace.previewDone', {
          count: String(result.value.match_count),
        }),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'tools.searchReplace.previewFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  const runReplace$ = $(async () => {
    if (dryRun.value) {
      return;
    }
    const find = findText.value.trim();
    if (!find) {
      await showError(translateApp(lang, 'common.error'), {
        text: translateApp(lang, 'tools.searchReplace.findRequired'),
      });
      return;
    }
    const names = Object.entries(selected.value)
      .filter(([, on]) => on)
      .map(([name]) => name);
    if (names.length === 0) {
      await showError(translateApp(lang, 'common.error'), {
        text: translateApp(lang, 'tools.searchReplace.tablesRequired'),
      });
      return;
    }

    const phrase = confirmPhrase.value || 'CONFIRM';
    const confirmed = await confirm(
      translateApp(lang, 'tools.searchReplace.replaceConfirmText', { phrase }),
      {
        title: translateApp(lang, 'tools.searchReplace.replaceTitle'),
        icon: 'warning',
        confirmText: translateApp(lang, 'tools.searchReplace.apply'),
        input: 'text',
        inputPlaceholder: phrase,
        inputValidator: (value: string) => {
          if (String(value || '') !== phrase) {
            return translateApp(lang, 'tools.searchReplace.replaceMismatch', { phrase });
          }
          return null;
        },
      },
    );
    if (!confirmed.isConfirmed) {
      return;
    }

    busy.value = true;
    try {
      result.value = await applySearchReplaceFromBrowser({
        find,
        replace: replaceText.value,
        tables: names,
        case_sensitive: caseSensitive.value,
        ignore_slugs: ignoreSlugs.value,
        confirmation: String(confirmed.value || ''),
      });
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'tools.searchReplace.applyDone', {
          count: String(result.value.replaced_count),
        }),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'tools.searchReplace.applyFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <PageHeader
        title={translateApp(lang, 'tools.searchReplace.title')}
        description={translateApp(lang, 'tools.searchReplace.subtitle')}
      />

      <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{translateApp(lang, 'tools.searchReplace.warning')}</p>
        {driver.value ? (
          <p class="mt-1 text-xs opacity-80">
            {translateApp(lang, 'tools.searchReplace.driver', { driver: driver.value })}
          </p>
        ) : null}
      </div>

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {translateApp(lang, 'tools.searchReplace.tablesTitle')}
          </h2>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              disabled={loading.value || busy.value}
              onClick$={checkAll$}
            >
              {translateApp(lang, 'common.selectAll')}
            </button>
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              disabled={loading.value || busy.value}
              onClick$={uncheckAll$}
            >
              {translateApp(lang, 'tools.searchReplace.uncheckAll')}
            </button>
          </div>
        </div>

        {loading.value ? (
          <p class="mt-3 text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
        ) : (
          <div class="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {tables.value.map((t) => (
              <label
                key={t.name}
                class="flex cursor-pointer items-start gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/40"
              >
                <input
                  type="checkbox"
                  class="mt-0.5"
                  checked={!!selected.value[t.name]}
                  onChange$={(e) => {
                    selected.value = {
                      ...selected.value,
                      [t.name]: (e.target as HTMLInputElement).checked,
                    };
                  }}
                />
                <span class="min-w-0">
                  <span class="block truncate font-mono text-xs text-gray-900 dark:text-gray-100">
                    {t.name}
                  </span>
                  <span class="block text-[11px] text-gray-500">
                    {translateApp(lang, 'tools.searchReplace.stringColumns', {
                      count: String(t.string_column_count),
                    })}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class={ADMIN_FORM_LABEL_CLASS} for="sr-find">
              {translateApp(lang, 'tools.searchReplace.find')}
            </label>
            <input
              id="sr-find"
              type="text"
              class={ADMIN_FORM_INPUT_CLASS}
              value={findText.value}
              onInput$={(e) => {
                findText.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div>
            <label class={ADMIN_FORM_LABEL_CLASS} for="sr-replace">
              {translateApp(lang, 'tools.searchReplace.replace')}
            </label>
            <input
              id="sr-replace"
              type="text"
              class={ADMIN_FORM_INPUT_CLASS}
              value={replaceText.value}
              disabled={dryRun.value}
              onInput$={(e) => {
                replaceText.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-800 dark:text-gray-200">
          <label class="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={dryRun.value}
              onChange$={(e) => {
                dryRun.value = (e.target as HTMLInputElement).checked;
              }}
            />
            {translateApp(lang, 'tools.searchReplace.dryRun')}
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={caseSensitive.value}
              onChange$={(e) => {
                caseSensitive.value = (e.target as HTMLInputElement).checked;
              }}
            />
            {translateApp(lang, 'tools.searchReplace.caseSensitive')}
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={ignoreSlugs.value}
              onChange$={(e) => {
                ignoreSlugs.value = (e.target as HTMLInputElement).checked;
              }}
            />
            {translateApp(lang, 'tools.searchReplace.ignoreSlugs')}
          </label>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class={ADMIN_PRIMARY_BUTTON_CLASS}
            disabled={busy.value || loading.value}
            onClick$={runPreview$}
          >
            {busy.value
              ? translateApp(lang, 'common.loading')
              : translateApp(lang, 'tools.searchReplace.preview')}
          </button>
          <button
            type="button"
            class="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
            disabled={busy.value || loading.value || dryRun.value}
            onClick$={runReplace$}
          >
            {translateApp(lang, 'tools.searchReplace.apply')}
          </button>
        </div>
        {dryRun.value ? (
          <p class="mt-2 text-xs text-gray-500">
            {translateApp(lang, 'tools.searchReplace.dryRunHint')}
          </p>
        ) : null}
      </section>

      {result.value ? (
        <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {translateApp(lang, 'tools.searchReplace.resultsTitle')}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {translateApp(lang, 'tools.searchReplace.resultsSummary', {
              matches: String(result.value.match_count),
              replaced: String(result.value.replaced_count),
            })}
          </p>

          {result.value.tables.length > 0 ? (
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-start text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    <th class="px-2 py-2 font-medium">{translateApp(lang, 'tools.searchReplace.colTable')}</th>
                    <th class="px-2 py-2 font-medium">{translateApp(lang, 'tools.searchReplace.colMatches')}</th>
                    <th class="px-2 py-2 font-medium">{translateApp(lang, 'tools.searchReplace.colReplaced')}</th>
                    <th class="px-2 py-2 font-medium">{translateApp(lang, 'tools.searchReplace.colColumns')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.tables.map((row) => (
                    <tr key={row.table} class="border-b border-gray-100 dark:border-gray-700/60">
                      <td class="px-2 py-2 font-mono text-xs">{row.table}</td>
                      <td class="px-2 py-2">{row.match_count}</td>
                      <td class="px-2 py-2">{row.replaced_count}</td>
                      <td class="px-2 py-2">{row.columns_scanned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.value.samples.length > 0 ? (
            <div class="mt-6 space-y-3">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {translateApp(lang, 'tools.searchReplace.samplesTitle')}
              </h3>
              {result.value.samples.map((sample, idx) => (
                <div
                  key={`${sample.table}-${sample.column}-${sample.pk ?? idx}`}
                  class="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-900/50"
                >
                  <p class="font-mono text-gray-700 dark:text-gray-300">
                    {sample.table}.{sample.column}
                    {sample.pk ? ` #${sample.pk}` : ''}
                  </p>
                  <p class="mt-1 text-gray-800 dark:text-gray-100">
                    <span class="font-semibold">{translateApp(lang, 'tools.searchReplace.before')}: </span>
                    {sample.before}
                  </p>
                  {sample.after !== null ? (
                    <p class="mt-1 text-gray-800 dark:text-gray-100">
                      <span class="font-semibold">{translateApp(lang, 'tools.searchReplace.after')}: </span>
                      {sample.after}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Search & Replace - Dashboard',
  meta: [{ name: 'description', content: 'Search and replace across database tables' }],
};
