import { component$, useSignal, useComputed$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { EmptyState } from '~/components/common/EmptyState';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { showError, showSuccess } from '~/lib/utils/toast';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { adminBuilderTemplateEditHref } from '~/lib/constants/routes';
import { builderTemplateKindLabel } from '~/lib/admin/builder-template-labels';
import type { BuilderTemplateKind, BuilderTemplateRow } from '~/lib/admin/builder-templates';
import {
  builderTemplateRowsFrom,
  runBuilderTemplateBulkDeleteFromBrowser,
  runBuilderTemplateDeleteFromBrowser,
} from '~/lib/admin/builder-template-actions';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';

const KIND_FILTERS: readonly BuilderTemplateKind[] = ['band', 'row', 'column', 'block'];

export const useBuilderTemplatesList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get<unknown>(API_ENDPOINTS.APPEARANCE.TEMPLATES);
    return builderTemplateRowsFrom(res.data);
  } catch (error: unknown) {
    console.error('Failed to load builder templates:', error);
    return [] as BuilderTemplateRow[];
  }
});

/** Templates are created from a builder ("Save as template"), so this list has no create page. */
export default component$(() => {
  const { lang } = useTranslate();
  const loader = useBuilderTemplatesList();
  const { confirm } = useSwal();
  const items = useSignal<BuilderTemplateRow[]>(loader.value);
  const selected = useSignal<number[]>([]);
  const search = useSignal('');
  const kindFilter = useSignal<'' | BuilderTemplateKind>('');
  const busy = useSignal(false);

  const filtered = useComputed$(() => {
    const q = search.value.trim().toLowerCase();
    return items.value.filter(
      (row) =>
        (kindFilter.value === '' || row.kind === kindFilter.value) &&
        (q === '' || `${row.name} ${builderTemplateKindLabel(lang, row)}`.toLowerCase().includes(q)),
    );
  });

  const removeRows = $((ids: number[]) => {
    const gone = new Set(ids);
    items.value = items.value.filter((r) => !gone.has(r.id));
    selected.value = selected.value.filter((id) => !gone.has(id));
  });

  const toggleSelect = $((id: number) => {
    selected.value = selected.value.includes(id)
      ? selected.value.filter((x) => x !== id)
      : [...selected.value, id];
  });

  const selectAll = $(() => {
    selected.value = filtered.value.map((r) => r.id);
  });

  const handleDelete = $(async (row: BuilderTemplateRow) => {
    const answer = await confirm(translateApp(lang, 'pages.templateDeleteConfirm', { name: row.name }), {
      title: translateApp(lang, 'common.delete'),
      icon: 'warning',
    });
    if (!answer.isConfirmed || busy.value) return;
    busy.value = true;
    const res = await runBuilderTemplateDeleteFromBrowser(row.id);
    busy.value = false;
    if (!res.ok) {
      showError(res.message);
      return;
    }
    await removeRows([row.id]);
    showSuccess(translateApp(lang, 'pages.templateDeleted'));
  });

  const handleBulkDelete = $(async () => {
    const ids = [...selected.value];
    if (ids.length === 0 || busy.value) return;
    const answer = await confirm(translateApp(lang, 'builderTemplates.bulkDeleteConfirm', { count: ids.length }), {
      title: translateApp(lang, 'common.delete'),
      icon: 'warning',
    });
    if (!answer.isConfirmed) return;
    busy.value = true;
    const res = await runBuilderTemplateBulkDeleteFromBrowser(ids);
    busy.value = false;
    if (!res.ok) {
      showError(res.message);
      return;
    }
    await removeRows(ids);
    showSuccess(translateApp(lang, 'builderTemplates.bulkDeleted', { count: res.data }));
  });

  return (
    <>
      <PageHeader
        title={translateApp(lang, 'builderTemplates.title')}
        description={translateApp(lang, 'builderTemplates.subtitle')}
      >
        <button
          type="button"
          onClick$={selectAll}
          disabled={filtered.value.length === 0}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'common.selectAll')}
        </button>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        {/* Filters + bulk bar */}
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search.value}
            onInput$={(e) => {
              search.value = (e.target as HTMLInputElement).value;
            }}
            placeholder={translateApp(lang, 'common.search')}
            aria-label={translateApp(lang, 'common.search')}
            class={`${ADMIN_FORM_INPUT_CLASS} min-w-[12rem] flex-1`}
          />
          <select
            class={`${ADMIN_NATIVE_SELECT_CLASS} w-auto`}
            aria-label={translateApp(lang, 'builderTemplates.kind')}
            value={kindFilter.value}
            onChange$={(e) => {
              kindFilter.value = (e.target as HTMLSelectElement).value as '' | BuilderTemplateKind;
            }}
          >
            <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
              {translateApp(lang, 'builderTemplates.allKinds')}
            </option>
            {KIND_FILTERS.map((kind) => (
              <option key={kind} class={ADMIN_NATIVE_OPTION_CLASS} value={kind}>
                {translateApp(lang, kind === 'block' ? 'pages.templateKindBlock' : `pages.${kind}`)}
              </option>
            ))}
          </select>

          {selected.value.length > 0 ? (
            <div class="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
              <span>
                {selected.value.length} {translateApp(lang, 'common.selected')}
              </span>
              <button
                type="button"
                disabled={busy.value}
                onClick$={handleBulkDelete}
                class="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {translateApp(lang, 'common.delete')}
              </button>
              <button
                type="button"
                onClick$={selectAll}
                class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {translateApp(lang, 'common.selectAll')}
              </button>
              <button
                type="button"
                onClick$={() => {
                  selected.value = [];
                }}
                class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {translateApp(lang, 'common.cancel')}
              </button>
            </div>
          ) : null}
        </div>

        {/* Empty states: nothing saved yet, or nothing matches the filters */}
        {items.value.length === 0 ? (
          <EmptyState
            title={translateApp(lang, 'builderTemplates.emptyTitle')}
            description={translateApp(lang, 'pages.templatesEmpty')}
          />
        ) : filtered.value.length === 0 ? (
          <p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {translateApp(lang, 'pages.templatesNoMatch')}
          </p>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-950/60">
                <tr>
                  <th class="w-10 px-3 py-3" />
                  <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'common.name')}
                  </th>
                  <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'builderTemplates.kind')}
                  </th>
                  <th class="hidden px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300 sm:table-cell">
                    {translateApp(lang, 'builderTemplates.updated')}
                  </th>
                  <th class="px-4 py-3 text-end font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.value.map((row) => (
                  <tr key={row.id}>
                    <td class="px-3 py-3">
                      <input
                        type="checkbox"
                        class={ADMIN_CHECKBOX_CLASS}
                        aria-label={row.name}
                        checked={selected.value.includes(row.id)}
                        onChange$={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">{builderTemplateKindLabel(lang, row)}</td>
                    <td class="hidden px-4 py-3 text-gray-500 dark:text-gray-400 sm:table-cell">
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString(lang) : '—'}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <Link
                          href={adminBuilderTemplateEditHref(lang, row.id)}
                          class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                        >
                          {translateApp(lang, 'builderTemplates.rename')}
                        </Link>
                        <button
                          type="button"
                          disabled={busy.value}
                          onClick$={() => handleDelete(row)}
                          class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {translateApp(lang, 'common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = { title: 'Builder templates - Dashboard' };
