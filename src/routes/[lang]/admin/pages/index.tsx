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
import {
  runPageBulkDeleteFromBrowser,
  runPageDeleteFromBrowser,
} from '../../../../lib/admin/page-actions';
import {
  adminPublicAbsoluteUrl,
  adminPublicDetailPath,
} from '../../../../lib/admin/public-content-url';
import { ADMIN_CHECKBOX_CLASS } from '../../../../lib/admin/native-select-classes';
import { AdminContentImportExportButtons } from '../../../../components/admin/AdminContentImportExportButtons';

function mapPageFromApi(raw: Record<string, unknown>): AdminPage {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    parent_id: raw.parent_id != null ? Number(raw.parent_id) : null,
    path: typeof raw.path === 'string' ? raw.path : null,
    public_path: typeof raw.public_path === 'string' ? raw.public_path : null,
    depth: typeof raw.depth === 'number' ? raw.depth : 0,
    exclude_from_search: Boolean(raw.exclude_from_search),
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
  const selectedForExport = useSignal<Set<string | number>>(new Set());
  const exportImportBusy = useSignal(false);

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

  const allIds = useComputed$(() => pagesState.value.map((p) => p.id));

  const onDelete$ = $(async (id: number) => {
    const prompt = await confirm(String(translateApp(lang, 'pages.deleteConfirm')), {
      icon: 'warning',
      title: String(translateApp(lang, 'common.delete')),
    });
    if (!prompt.isConfirmed) return;

    const deleted = await runPageDeleteFromBrowser(id);
    if (!deleted.ok) {
      await showError(deleted.message || String(translateApp(lang, 'common.error')));
      return;
    }
    await success(String(translateApp(lang, 'common.deleted')));
    await refetch();
  });

  const onBulkDelete$ = $(async () => {
    if (selected.value.length === 0) return;
    const prompt = await confirm(String(translateApp(lang, 'pages.deleteConfirm')), {
      icon: 'warning',
      title: String(translateApp(lang, 'common.delete')),
    });
    if (!prompt.isConfirmed) return;

    const deleted = await runPageBulkDeleteFromBrowser(selected.value);
    if (!deleted.ok) {
      await showError(deleted.message || String(translateApp(lang, 'common.error')));
      return;
    }
    selected.value = [];
    selectedForExport.value = new Set();
    await success(String(translateApp(lang, 'common.deleted')));
    await refetch();
  });

  return (
    <div>
      <PageHeader
        title={translateApp(lang, 'pages.title')}
        description={translateApp(lang, 'pages.subtitle')}
      >
        <div class="flex flex-wrap gap-2">
          <AdminContentImportExportButtons
            lang={lang}
            exportEndpoint={API_ENDPOINTS.PAGES.EXPORT}
            importEndpoint={API_ENDPOINTS.PAGES.IMPORT}
            filePrefix="pages"
            selectedIds={selectedForExport}
            busy={exportImportBusy}
            onRefetch$={$(async () => {
              await refetch();
            })}
          />
          <Link
            href={R.ADMIN.PAGES_NEW}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {translateApp(lang, 'pages.addNew')}
          </Link>
        </div>
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
                  <th scope="col" class="w-10 px-3 py-2 align-middle text-start">
                    <div class="flex h-4 items-center justify-start">
                      <input
                        type="checkbox"
                        class={ADMIN_CHECKBOX_CLASS}
                        aria-label={translateApp(lang, 'common.selectAll')}
                        checked={
                          allIds.value.length > 0 &&
                          selected.value.length === allIds.value.length
                        }
                        onChange$={(e) => {
                          selected.value = (e.target as HTMLInputElement).checked
                            ? [...allIds.value]
                            : [];
                          selectedForExport.value = new Set(selected.value);
                        }}
                      />
                    </div>
                  </th>
                  <th class="px-3 py-2 text-start align-middle">{translateApp(lang, 'pages.fields.title')}</th>
                  <th class="px-3 py-2 text-start align-middle">{translateApp(lang, 'pages.fields.slug')}</th>
                  <th class="px-3 py-2 text-start align-middle">{translateApp(lang, 'pages.fields.status')}</th>
                  <th class="px-3 py-2 text-end align-middle">{translateApp(lang, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pagesState.value.map((page) => {
                  const publicPath = adminPublicDetailPath(lang, 'pages', page.slug, {
                    parentId: page.parent_id,
                    nestedPath: page.path,
                  });
                  const publicHref = publicPath ? adminPublicAbsoluteUrl(publicPath) : null;
                  const depth = Math.max(0, Number(page.depth ?? 0));
                  return (
                  <tr key={page.id} class="border-t border-gray-100 dark:border-gray-800">
                    <td class="w-10 px-3 py-2 align-middle">
                      <div class="flex h-4 items-center justify-start">
                        <input
                          type="checkbox"
                          class={ADMIN_CHECKBOX_CLASS}
                          aria-label={page.title}
                          checked={selected.value.includes(page.id)}
                          onChange$={(e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            selected.value = checked
                              ? [...selected.value, page.id]
                              : selected.value.filter((id) => id !== page.id);
                            selectedForExport.value = new Set(selected.value);
                          }}
                        />
                      </div>
                    </td>
                    <td class="px-3 py-2 align-middle">
                      <span style={{ paddingInlineStart: `${depth * 1.25}rem` }} class="inline-flex flex-wrap items-center gap-2">
                        {page.title}
                        {page.exclude_from_search ? (
                          <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {translateApp(lang, 'pages.excludeFromSearchBadge')}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td class="px-3 py-2 align-middle font-mono text-xs">{page.path || page.slug}</td>
                    <td class="px-3 py-2 align-middle">{page.status}</td>
                    <td class="px-3 py-2 text-end align-middle space-x-2">
                      {publicHref ? (
                        <a
                          href={publicHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {translateApp(lang, 'common.view')}
                        </a>
                      ) : null}
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
                  );
                })}
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
