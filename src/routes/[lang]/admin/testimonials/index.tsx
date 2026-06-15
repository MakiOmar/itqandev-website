import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { AdminContentImportExportButtons } from '../../../../components/admin/AdminContentImportExportButtons';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { adminTestimonialEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import type { Testimonial } from '../../../../types';
import {
  mapTestimonialFromApi,
  runTestimonialBulkDeleteFromBrowser,
  runTestimonialDeleteFromBrowser,
} from '../../../../lib/admin/testimonial-actions';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';
import { usePublicSiteMeta } from '../layout';
import { primaryLocaleForContent } from '../../../../lib/content-display-locale';
import { uiLangFromUrlPathname } from '../../../../lib/i18n/ui-locale-path';

const TESTIMONIALS_LIST_PER_PAGE = '100';

function extractTestimonialRows(response: unknown): Record<string, unknown>[] {
  const top = response as { data?: unknown };
  const body = top?.data ?? response;
  if (Array.isArray(body)) {
    return body as Record<string, unknown>[];
  }
  if (body && typeof body === 'object' && 'data' in (body as object) && Array.isArray((body as { data: unknown }).data)) {
    return (body as { data: Record<string, unknown>[] }).data;
  }
  // Laravel paginator at top level { data: [...], meta, links }
  if (
    response &&
    typeof response === 'object' &&
    'data' in (response as object) &&
    Array.isArray((response as { data: unknown }).data)
  ) {
    return (response as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

function testimonialsListPath(): string {
  return `${API_ENDPOINTS.TESTIMONIALS.LIST}?per_page=${TESTIMONIALS_LIST_PER_PAGE}`;
}

/**
 * Load testimonials list (admin)
 */
export const useTestimonialsList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const testimonialsRes = await apiClient.get(testimonialsListPath()).catch(() => ({ data: [] }));
    return extractTestimonialRows(testimonialsRes).map((row) => mapTestimonialFromApi(row));
  } catch (error: unknown) {
    console.error('Failed to load testimonials:', error);
    return [] as Testimonial[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const location = useLocation();
  const R = useAppRoutes();
  const listContentLocale = uiLangFromUrlPathname(location.url.pathname);
  const { confirm, success, error: showError } = useSwal();
  const testimonialsLoader = useTestimonialsList();
  const langConfig = usePublicSiteMeta();
  const deleteRunning = useSignal(false);

  const { items: testimonials, loading, refetch } = useLocaleAwareList<Testimonial>(
    testimonialsLoader,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get(testimonialsListPath()).then((res) => {
        return extractTestimonialRows(res).map((row) => mapTestimonialFromApi(row));
      });
    }),
  );

  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');
  const exportImportBusy = useSignal(false);

  const filteredTestimonials = useSignal<Testimonial[]>(testimonials.value);

  useTask$(({ track }) => {
    const rows = track(() => testimonials.value);
    const q = track(() => searchQuery.value);
    if (!q.trim()) {
      filteredTestimonials.value = rows;
    } else {
      const query = q.toLowerCase();
      filteredTestimonials.value = rows.filter(
        (test) =>
          test.clientName?.toLowerCase().includes(query) ||
          test.clientRole?.toLowerCase().includes(query) ||
          test.company?.toLowerCase().includes(query) ||
          test.content?.toLowerCase().includes(query),
      );
    }
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const deleteTranslations = {
    confirmText: String(translateApp(lang, 'testimonials.deleteConfirm')),
    title: String(translateApp(lang, 'common.delete')),
    successTitle: String(translateApp(lang, 'common.success')),
    deletedText: String(translateApp(lang, 'common.deleted')),
  };

  const handleDelete = $(async (testimonial: Testimonial) => {
    const result = await confirm(deleteTranslations.confirmText, {
      icon: 'warning',
      title: deleteTranslations.title,
    });
    if (!result.isConfirmed) return;

    if (deleteRunning.value) return;
    deleteRunning.value = true;

    const deleted = await runTestimonialDeleteFromBrowser(testimonial.id);
    deleteRunning.value = false;

    if (!deleted.ok) {
      await showError(deleted.message || 'Failed to delete testimonial');
      return;
    }

    await success(deleteTranslations.successTitle, { text: deleteTranslations.deletedText });
    const removedId = String(testimonial.id);
    testimonials.value = testimonials.value.filter((t) => String(t.id) !== removedId);
    selectedItems.value = selectedItems.value.filter((id) => id !== removedId);
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const result = await confirm(deleteTranslations.confirmText, {
      icon: 'warning',
      title: deleteTranslations.title,
    });
    if (!result.isConfirmed) return;

    if (deleteRunning.value) return;
    deleteRunning.value = true;

    const deleted = await runTestimonialBulkDeleteFromBrowser(selectedItems.value);
    deleteRunning.value = false;

    if (!deleted.ok) {
      await showError(deleted.message || 'Failed to delete testimonials');
      return;
    }

    await success(deleteTranslations.successTitle, { text: deleteTranslations.deletedText });

    const toDelete = new Set(selectedItems.value);
    testimonials.value = testimonials.value.filter((t) => !toDelete.has(String(t.id)));
    selectedItems.value = [];
  });

  const toggleSelect = $((id: string) => {
    const newSelected = [...selectedItems.value];
    const index = newSelected.indexOf(id);
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(id);
    }
    selectedItems.value = newSelected;
  });

  const selectAll = $(() => {
    selectedItems.value = filteredTestimonials.value.map((t) => String(t.id));
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  const refetchList = $((locale: string) => refetch(locale));

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (testimonial: Testimonial): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      testimonial.contentLocale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (testimonial: Testimonial): string => {
    const rows = testimonial.translations;
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

  return (
    <>
      <PageHeader title={translateApp(lang, 'testimonials.title')} description={translateApp(lang, 'testimonials.subtitle')}>
        <div class="flex flex-wrap gap-2">
          <AdminContentImportExportButtons
            lang={lang}
            exportEndpoint={API_ENDPOINTS.TESTIMONIALS.EXPORT}
            importEndpoint={API_ENDPOINTS.TESTIMONIALS.IMPORT}
            filePrefix="testimonials"
            selectedIds={selectedItems}
            busy={exportImportBusy}
            onRefetch$={refetchList}
          />

          <button
            type="button"
            onClick$={selectAll}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'common.selectAll')}
          </button>
          <Link
            href={R.ADMIN.TESTIMONIALS_NEW}
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {translateApp(lang, 'testimonials.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'testimonials.list')}</h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {translateApp(lang, 'contentTranslations.sectionTitle')}:{' '}
              <span class="font-medium text-gray-700 dark:text-gray-200">
                {languageLabelByCode.get(listContentLocale) || listContentLocale} ({listContentLocale})
              </span>
            </p>
          </div>
          {selectedItems.value.length > 0 && (
            <div class="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
              <span>
                {selectedItems.value.length} {translateApp(lang, 'common.selected')}
              </span>
              <button
                type="button"
                onClick$={handleBulkDelete}
                class="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
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
                onClick$={deselectAll}
                class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {translateApp(lang, 'common.cancel')}
              </button>
            </div>
          )}
        </div>

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
          <p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'common.loading')}</p>
        ) : filteredTestimonials.value.length === 0 ? (
          <EmptyState title={translateApp(lang, 'testimonials.noTestimonials')} />
        ) : (
          <ul class="space-y-4">
            {filteredTestimonials.value.map((testimonial) => (
              <li key={testimonial.id} class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.value.includes(String(testimonial.id))}
                      onChange$={() => toggleSelect(String(testimonial.id))}
                      class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">{testimonial.clientName}</h3>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                          {'⭐'.repeat(testimonial.rating || 5)}
                        </span>
                        {testimonial.approved && (
                          <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            {translateApp(lang, 'testimonials.approvedLabel')}
                          </span>
                        )}
                      </div>
                      {(testimonial.clientRole || testimonial.company) && (
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                          {[testimonial.clientRole, testimonial.company].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      {testimonial.project && (
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {translateApp(lang, 'projects.title')}: {testimonial.project.title}
                        </p>
                      )}
                      <div class="mt-1 flex flex-wrap gap-1">
                        <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                          {translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}: {mainLocaleLabel(testimonial)}
                        </span>
                        <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                          {translateApp(lang, 'contentTranslations.addTranslations')}: {translationsLabel(testimonial)}
                        </span>
                      </div>
                      <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">{testimonial.content}</p>
                      {testimonial.videoUrl && (
                        <p class="mt-2">
                          <a
                            href={testimonial.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {translateApp(lang, 'testimonials.videoLink')}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <Link
                      href={adminTestimonialEditHref(lang, testimonial.id)}
                      class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                    >
                      {translateApp(lang, 'common.edit')}
                    </Link>
                    <button
                      type="button"
                      onClick$={() => handleDelete(testimonial)}
                      class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {translateApp(lang, 'common.delete')}
                    </button>
                  </div>
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
  title: 'Testimonials - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage testimonials',
    },
  ],
};
