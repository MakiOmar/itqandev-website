import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { ROUTES } from '../../../lib/constants/routes';
import type { Testimonial } from '../../../types';
import {
  mapTestimonialFromApi,
  useDeleteTestimonial,
  useBulkDeleteTestimonials,
} from '../../../lib/admin/testimonial-actions';

/**
 * Load testimonials list (admin)
 */
export const useTestimonialsList = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const testimonialsRes = await apiClient.get(API_ENDPOINTS.TESTIMONIALS.LIST).catch(() => ({ data: [] }));

    const extractRows = (): Record<string, unknown>[] => {
      const response: unknown = testimonialsRes;
      const body = (response as { data?: unknown })?.data ?? response;
      if (Array.isArray(body)) {
        return body as Record<string, unknown>[];
      }
      if (body && typeof body === 'object' && 'data' in (body as object) && Array.isArray((body as { data: unknown }).data)) {
        return (body as { data: Record<string, unknown>[] }).data;
      }
      return [];
    };

    return extractRows().map((row) => mapTestimonialFromApi(row));
  } catch (error: unknown) {
    console.error('Failed to load testimonials:', error);
    return [] as Testimonial[];
  }
});

export default component$(() => {
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const data = useTestimonialsList();
  const deleteAction = useDeleteTestimonial();
  const bulkDeleteAction = useBulkDeleteTestimonials();

  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const filteredTestimonials = useSignal<Testimonial[]>(data.value);

  useTask$(({ track }) => {
    const rows = track(() => data.value);
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
    confirmText: String(t('testimonials.deleteConfirm')),
    title: String(t('common.delete')),
    successTitle: String(t('common.success')),
    deletedText: String(t('common.deleted')),
  };

  const handleDelete = $(async (testimonial: Testimonial) => {
    const deleteConfirmText = deleteTranslations.confirmText;
    const deleteTitle = deleteTranslations.title;
    const successTitle = deleteTranslations.successTitle;
    const deletedText = deleteTranslations.deletedText;

    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(testimonial.id) });
    if (response.value?.failed) {
      await showError((response.value as { message?: string }).message || 'Failed to delete testimonial');
    } else {
      await success(successTitle, { text: deletedText });
      navigate(window.location.pathname);
    }
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const deleteConfirmText = deleteTranslations.confirmText;
    const deleteTitle = deleteTranslations.title;
    const successTitle = deleteTranslations.successTitle;
    const deletedText = deleteTranslations.deletedText;

    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await bulkDeleteAction.submit({ ids: selectedItems.value });
    if (response.value?.failed) {
      await showError((response.value as { message?: string }).message || 'Failed to delete testimonials');
    } else {
      await success(successTitle, { text: deletedText });
      selectedItems.value = [];
      navigate(window.location.pathname);
    }
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

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  return (
    <>
      <PageHeader title={t('testimonials.title')} description={t('testimonials.subtitle')}>
        <div class="flex flex-wrap gap-2">
          {selectedItems.value.length > 0 && (
            <>
              <button
                type="button"
                onClick$={handleBulkDelete}
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                {t('common.delete')} ({selectedItems.value.length})
              </button>
              <button
                type="button"
                onClick$={deselectAll}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </>
          )}
          <Link
            href={ROUTES.ADMIN.TESTIMONIALS_NEW}
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {t('testimonials.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('testimonials.list')}</h2>

        <div class="mb-4">
          <input
            type="text"
            value={searchQuery.value}
            onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
            placeholder={t('common.search')}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>

        {filteredTestimonials.value.length === 0 ? (
          <EmptyState title={t('testimonials.noTestimonials')} />
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
                            {t('testimonials.approvedLabel')}
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
                          {t('projects.title')}: {testimonial.project.title}
                        </p>
                      )}
                      <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">{testimonial.content}</p>
                      {testimonial.videoUrl && (
                        <p class="mt-2">
                          <a
                            href={testimonial.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {t('testimonials.videoLink')}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <Link
                      href={ROUTES.ADMIN.TESTIMONIALS_EDIT(testimonial.id)}
                      class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                    >
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      onClick$={() => handleDelete(testimonial)}
                      class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('common.delete')}
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
