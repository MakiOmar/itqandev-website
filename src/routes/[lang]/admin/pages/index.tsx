import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../lib/api/client';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { adminPageEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import type { AdminPage } from '../../../../types/page';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';
import { useDeletePage, useBulkDeletePages } from '../../../../lib/admin/page-actions';
import { looksLikeRouteActionResult, submitRouteActionFormData } from '../../../../lib/admin/route-action-form-submit';

function mapPageFromApi(raw: Record<string, unknown>): AdminPage {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    translations: Array.isArray(raw.translations)
      ? (raw.translations as AdminPage['translations'])
      : [],
    createdAt: (raw.created_at as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? '',
  };
}

function normalizeList(body: unknown): AdminPage[] {
  if (Array.isArray(body)) {
    return body.map((x) => mapPageFromApi(x as Record<string, unknown>));
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data).map((x) =>
      mapPageFromApi(x as Record<string, unknown>),
    );
  }
  return [];
}

export const usePagesList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get(API_ENDPOINTS.PAGES.LIST);
    return normalizeList((response as { data?: unknown })?.data ?? response);
  } catch {
    return [];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();
  const pages = usePagesList();
  const selected = useSignal<number[]>([]);

  const { items: pagesState, loading, refetch } = useLocaleAwareList<AdminPage>(
    pages,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get(API_ENDPOINTS.PAGES.LIST).then((res: unknown) => {
        const body = (res as { data?: unknown })?.data ?? res;
        return normalizeList(body);
      });
    }),
  );

  const deleteAction = useDeletePage();
  const bulkDeleteAction = useBulkDeletePages();
  const allIds = useComputed$(() => pagesState.value.map((p) => p.id));

  const onDelete$ = $(async (id: number) => {
    const ok = await confirm({
      title: translateApp(lang, 'common.delete'),
      text: translateApp(lang, 'pages.deleteConfirm'),
    });
    if (!ok) return;
    const result = await submitRouteActionFormData(deleteAction, { id: String(id) });
    if (looksLikeRouteActionResult(result) && (result as { success?: boolean }).success) {
      await success(translateApp(lang, 'common.deleted'));
      await refetch();
    } else {
      await showError(
        String((result as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  const onBulkDelete$ = $(async () => {
    if (selected.value.length === 0) return;
    const ok = await confirm({
      title: translateApp(lang, 'common.delete'),
      text: translateApp(lang, 'pages.deleteConfirm'),
    });
    if (!ok) return;
    const result = await submitRouteActionFormData(bulkDeleteAction, {
      ids: selected.value.join(','),
    });
    if (looksLikeRouteActionResult(result) && (result as { success?: boolean }).success) {
      selected.value = [];
      await success(translateApp(lang, 'common.deleted'));
      await refetch();
    } else {
      await showError(
        String((result as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  return (
    <div>
      <PageHeader
        title={translateApp(lang, 'pages.title')}
        description={translateApp(lang, 'pages.subtitle')}
      >
        <Link
          href={R.ADMIN.PAGES_NEW}
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {translateApp(lang, 'pages.addNew')}
        </Link>
      </PageHeader>

      {loading.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : pagesState.value.length === 0 ? (
        <EmptyState title={translateApp(lang, 'pages.empty')} />
      ) : (
        <>
          {selected.value.length > 0 ? (
            <div class="mb-3">
              <button
                type="button"
                class="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                onClick$={onBulkDelete$}
              >
                {translateApp(lang, 'common.delete')} ({selected.value.length})
              </button>
            </div>
          ) : null}
          <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-start dark:bg-gray-900">
                <tr>
                  <th class="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={
                        allIds.value.length > 0 &&
                        selected.value.length === allIds.value.length
                      }
                      onChange$={(e) => {
                        selected.value = (e.target as HTMLInputElement).checked
                          ? [...allIds.value]
                          : [];
                      }}
                    />
                  </th>
                  <th class="px-3 py-2 text-start">{translateApp(lang, 'pages.fields.title')}</th>
                  <th class="px-3 py-2 text-start">{translateApp(lang, 'pages.fields.slug')}</th>
                  <th class="px-3 py-2 text-start">{translateApp(lang, 'pages.fields.status')}</th>
                  <th class="px-3 py-2 text-end">{translateApp(lang, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pagesState.value.map((page) => (
                  <tr key={page.id} class="border-t border-gray-100 dark:border-gray-800">
                    <td class="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.value.includes(page.id)}
                        onChange$={(e) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          selected.value = checked
                            ? [...selected.value, page.id]
                            : selected.value.filter((id) => id !== page.id);
                        }}
                      />
                    </td>
                    <td class="px-3 py-2">{page.title}</td>
                    <td class="px-3 py-2 font-mono text-xs">{page.slug}</td>
                    <td class="px-3 py-2">{page.status}</td>
                    <td class="px-3 py-2 text-end space-x-2">
                      <Link
                        href={adminPageEditHref(lang, page.id)}
                        class="text-primary-600 hover:underline"
                      >
                        {translateApp(lang, 'common.edit')}
                      </Link>
                      <button
                        type="button"
                        class="text-red-600 hover:underline"
                        onClick$={() => onDelete$(page.id)}
                      >
                        {translateApp(lang, 'common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Pages',
};
