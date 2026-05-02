import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { ROUTES } from '../../../lib/constants/routes';
import type { Category } from '../../../types';
import { useSiteLanguageConfig } from '../layout';
import { useLocaleAwareList } from '../../../lib/hooks/useLocaleAwareList';
import { primaryLocaleForContent } from '../../../lib/content-display-locale';
import { useDeleteCategory, useBulkDeleteCategories } from '../../../lib/admin/category-actions';
import { looksLikeRouteActionResult, submitRouteActionFormData } from '../../../lib/admin/route-action-form-submit';

/**
 * API payload shape returned by Laravel index()
 */
type CategoriesListPayload = {
  data: Category[];
  meta?: { cache?: { hit?: boolean } };
};

/**
 * Load categories
 */
export const useCategories = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);

    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST);
    let body: unknown = (response as any)?.data ?? response;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Categories response was a string but not valid JSON:', e);
        return [];
      }
    }

    if (body && typeof body === 'object' && 'data' in (body as any) && Array.isArray((body as any).data)) {
      return (body as CategoriesListPayload).data;
    }

    if (Array.isArray(body)) {
      return body as Category[];
    }

    return [];
  } catch (error: any) {
    console.error('Failed to load categories:', error);
    return [];
  }
});

/**
 * Categories list only — create/edit live on /categories/new and /categories/:id
 */
export default component$(() => {
  const { lang } = useTranslate();
  const { confirm, success, error: showError } = useSwal();

  const categories = useCategories();
  const langConfig = useSiteLanguageConfig();

  const { items: categoriesState, loading } = useLocaleAwareList<Category>(
    categories,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get(API_ENDPOINTS.CATEGORIES.LIST).then((response: any) => {
        let body: unknown = response?.data ?? response;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            return [];
          }
        }
        if (body && typeof body === 'object' && 'data' in (body as any) && Array.isArray((body as any).data)) {
          return (body as any).data as Category[];
        }
        if (Array.isArray(body)) {
          return body as Category[];
        }
        return [];
      });
    }),
  );

  const deleteAction = useDeleteCategory();
  const bulkDeleteAction = useBulkDeleteCategories();

  const translations = {
    success: translateApp(lang, 'common.success'),
    deleted: translateApp(lang, 'common.deleted'),
    delete: translateApp(lang, 'common.delete'),
    deleteConfirm: translateApp(lang, 'categories.deleteConfirm'),
  };

  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (category: Category): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      (category as any).content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (category: Category): string => {
    const rows = (category as any).translations as Array<{ locale?: string | null }> | undefined;
    const locales = Array.isArray(rows)
      ? Array.from(
          new Set(
            rows
              .map((r) => String(r?.locale ?? '').trim().toLowerCase())
              .filter((x) => x.length > 0),
          ),
        )
      : [];
    if (locales.length === 0) {
      return translateApp(lang, 'contentTranslations.noSecondaryLanguages') || '—';
    }
    const labels = locales.map((code) => `${languageLabelByCode.get(code) || code} (${code})`);
    return `${locales.length}: ${labels.join(', ')}`;
  };

  const filteredCategories = useComputed$(() => {
    const list = categoriesState.value || [];
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.slug ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const handleDelete = $(async (category: Category) => {
    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    const val = await submitRouteActionFormData(deleteAction, { id: String(category.id) }, looksLikeRouteActionResult);
    if (val?.failed) {
      await showError(val.message || 'Failed to delete category');
      return;
    }

    await success(translations.success, { text: translations.deleted });
    categoriesState.value = categoriesState.value.filter((c) => c.id !== category.id);
    selectedItems.value = selectedItems.value.filter((id) => id !== String(category.id));
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    const val = await submitRouteActionFormData(
      bulkDeleteAction,
      { ids: selectedItems.value },
      looksLikeRouteActionResult,
    );
    if (val?.failed) {
      await showError(val.message || 'Failed to delete categories');
      return;
    }

    await success(translations.success, { text: translations.deleted });

    const toDelete = new Set(selectedItems.value);
    categoriesState.value = categoriesState.value.filter((c) => !toDelete.has(String(c.id)));
    selectedItems.value = [];
  });

  const toggleSelect = $((id: string) => {
    const next = [...selectedItems.value];
    const index = next.indexOf(id);
    if (index > -1) next.splice(index, 1);
    else next.push(id);
    selectedItems.value = next;
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  return (
    <>
      <PageHeader title={translateApp(lang, 'categories.title')} description={translateApp(lang, 'categories.subtitle')}>
        <div class="flex flex-wrap gap-2">
          {selectedItems.value.length > 0 && (
            <>
              <button
                type="button"
                onClick$={handleBulkDelete}
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                {translateApp(lang, 'common.delete')} ({selectedItems.value.length})
              </button>
              <button
                type="button"
                onClick$={deselectAll}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.cancel')}
              </button>
            </>
          )}

          <Link
            href={ROUTES.ADMIN.CATEGORIES_NEW}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {translateApp(lang, 'categories.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'categories.list')}</h2>

        <div class="mb-4">
          <input
            type="text"
            value={searchQuery.value}
            onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
            placeholder={translateApp(lang, 'common.search')}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>

        {loading.value ? (
          <div class="py-6 text-center text-gray-500 dark:text-gray-400">{translateApp(lang, 'common.loading')}</div>
        ) : filteredCategories.value.length === 0 ? (
          <EmptyState title={translateApp(lang, 'categories.noCategories')} />
        ) : (
          <ul class="space-y-2">
            {filteredCategories.value.map((category) => (
              <li
                key={category.id}
                class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
              >
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.value.includes(String(category.id))}
                    onChange$={() => toggleSelect(String(category.id))}
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />

                  <div>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {translateApp(lang, 'categories.slug')}: {category.slug}
                    </p>

                    {category.description && (
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                    )}

                    <div class="mt-1 flex flex-wrap gap-1">
                      <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                        {translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}: {mainLocaleLabel(category)}
                      </span>
                      <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                        {translateApp(lang, 'contentTranslations.addTranslations')}: {translationsLabel(category)}
                      </span>
                    </div>

                    {(category as any).isFeatured && (
                      <span class="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                        {translateApp(lang, 'categories.featured')}
                      </span>
                    )}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {translateApp(lang, 'categories.projectsCount', { count: (category as any).projectsCount ?? 0 })}
                  </span>

                  <Link
                    href={ROUTES.ADMIN.CATEGORIES_EDIT(category.id)}
                    class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                  >
                    {translateApp(lang, 'common.edit')}
                  </Link>

                  <button
                    type="button"
                    onClick$={() => handleDelete(category)}
                    class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {translateApp(lang, 'common.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Categories - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage categories',
    },
  ],
};
