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
import {
  adminFormBuilderHref,
  adminFormEditHref,
  useAppRoutes,
} from '../../../../lib/constants/routes';
import type { AdminForm } from '../../../../types/form';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';
import { useDeleteForm, useBulkDeleteForms } from '../../../../lib/admin/form-actions';
import { looksLikeRouteActionResult, submitRouteActionFormData } from '../../../../lib/admin/route-action-form-submit';
import { ADMIN_PRIMARY_BUTTON_CLASS } from '../../../../lib/admin/native-select-classes';

function mapForm(raw: Record<string, unknown>): AdminForm {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    layout: (raw.layout as AdminForm['layout']) ?? { rows: [] },
    actions: Array.isArray(raw.actions) ? (raw.actions as AdminForm['actions']) : [],
    settings: (raw.settings as AdminForm['settings']) ?? {},
    translations: Array.isArray(raw.translations)
      ? (raw.translations as AdminForm['translations'])
      : [],
    submissions_count: Number(raw.submissions_count ?? 0),
    createdAt: (raw.created_at as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? '',
  };
}

function normalizeList(body: unknown): AdminForm[] {
  if (Array.isArray(body)) return body.map((x) => mapForm(x as Record<string, unknown>));
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data).map((x) => mapForm(x as Record<string, unknown>));
  }
  return [];
}

export const useFormsList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get(API_ENDPOINTS.FORMS.LIST);
    return normalizeList((response as { data?: unknown })?.data ?? response);
  } catch {
    return [];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();
  const forms = useFormsList();
  const selected = useSignal<number[]>([]);

  const { items: formsState, loading, refetch } = useLocaleAwareList<AdminForm>(
    forms,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get(API_ENDPOINTS.FORMS.LIST).then((res: unknown) => {
        const body = (res as { data?: unknown })?.data ?? res;
        return normalizeList(body);
      });
    }),
  );

  const deleteAction = useDeleteForm();
  const bulkDeleteAction = useBulkDeleteForms();
  const allIds = useComputed$(() => formsState.value.map((f) => f.id));

  const onDelete$ = $(async (id: number) => {
    const swalResult = await confirm(translateApp(lang, 'forms.deleteConfirm'), {
      title: translateApp(lang, 'common.delete'),
    });
    if (!(swalResult as { isConfirmed?: boolean })?.isConfirmed) return;
    const result = await submitRouteActionFormData(
      deleteAction,
      { id: String(id) },
      looksLikeRouteActionResult,
    );
    if (looksLikeRouteActionResult(result) && (result as { success?: boolean }).success) {
      await success(translateApp(lang, 'common.deleted'));
      await refetch(lang);
    } else {
      await showError(
        String((result as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  const onBulkDelete$ = $(async () => {
    if (selected.value.length === 0) return;
    const swalResult = await confirm(translateApp(lang, 'forms.bulkDeleteConfirm'), {
      title: translateApp(lang, 'common.delete'),
    });
    if (!(swalResult as { isConfirmed?: boolean })?.isConfirmed) return;
    const result = await submitRouteActionFormData(
      bulkDeleteAction,
      { ids: selected.value.join(',') },
      looksLikeRouteActionResult,
    );
    if (looksLikeRouteActionResult(result) && (result as { success?: boolean }).success) {
      selected.value = [];
      await success(translateApp(lang, 'common.deleted'));
      await refetch(lang);
    } else {
      await showError(
        String((result as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  return (
    <div class="space-y-4">
      <PageHeader
        title={translateApp(lang, 'forms.title')}
        description={translateApp(lang, 'forms.subtitle')}
      >
        <Link href={R.ADMIN.FORMS_NEW} class={ADMIN_PRIMARY_BUTTON_CLASS}>
          {translateApp(lang, 'forms.create')}
        </Link>
      </PageHeader>

      {loading.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : formsState.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'forms.emptyTitle')}
          description={translateApp(lang, 'forms.empty')}
        />
      ) : (
        <>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
              onClick$={() => {
                selected.value =
                  selected.value.length === allIds.value.length ? [] : [...allIds.value];
              }}
            >
              {translateApp(lang, 'common.selectAll')}
            </button>
            <button
              type="button"
              class="rounded border border-red-500 bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-40"
              disabled={selected.value.length === 0}
              onClick$={onBulkDelete$}
            >
              {translateApp(lang, 'common.delete')}
            </button>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900">
            <table class="min-w-full text-start text-sm">
              <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-slate-950">
                <tr>
                  <th class="px-3 py-2" />
                  <th class="px-3 py-2">{translateApp(lang, 'forms.fields.title')}</th>
                  <th class="px-3 py-2">{translateApp(lang, 'forms.fields.slug')}</th>
                  <th class="px-3 py-2">{translateApp(lang, 'forms.fields.status')}</th>
                  <th class="px-3 py-2">{translateApp(lang, 'forms.submissions')}</th>
                  <th class="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {formsState.value.map((form) => (
                  <tr
                    key={form.id}
                    class="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td class="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.value.includes(form.id)}
                        onChange$={(e) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          selected.value = checked
                            ? [...selected.value, form.id]
                            : selected.value.filter((id) => id !== form.id);
                        }}
                      />
                    </td>
                    <td class="px-3 py-2 font-medium">
                      <Link
                        href={adminFormEditHref(lang, form.id)}
                        class="text-primary-700 hover:underline dark:text-primary-300"
                      >
                        {form.title}
                      </Link>
                    </td>
                    <td class="px-3 py-2 text-gray-500">{form.slug}</td>
                    <td class="px-3 py-2">{form.status}</td>
                    <td class="px-3 py-2">{form.submissions_count ?? 0}</td>
                    <td class="px-3 py-2 text-end">
                      <div class="inline-flex gap-2">
                        <Link
                          href={adminFormBuilderHref(lang, form.id)}
                          class="text-xs text-primary-700 hover:underline"
                        >
                          {translateApp(lang, 'forms.openBuilder')}
                        </Link>
                        <button
                          type="button"
                          class="text-xs text-red-600"
                          onClick$={() => onDelete$(form.id)}
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
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = ({ params }) => ({
  title: translateApp(String(params.lang || 'en'), 'forms.title'),
});
