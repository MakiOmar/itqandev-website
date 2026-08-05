import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../../components/common/PageHeader';
import { EmptyState } from '../../../../../../components/common/EmptyState';
import { SubmissionPayloadView } from '../../../../../../components/admin/forms/SubmissionPayloadView';
import { useTranslate, translateApp } from '../../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../../../lib/api/client';
import { adminApiClient } from '../../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../../lib/api/endpoints';
import { getConfig } from '../../../../../../lib/config';
import {
  adminFormBuilderHref,
  adminFormEditHref,
  useAppRoutes,
} from '../../../../../../lib/constants/routes';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../../lib/admin/native-select-classes';

type SubmissionRow = {
  id: number;
  status: string;
  locale: string | null;
  ip_address: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type SubmissionsPageData = {
  formId: number;
  formTitle: string;
  formSlug: string;
  formTranslations: Array<{ locale: string; title?: string | null }>;
  formLayout: unknown;
  submissions: SubmissionRow[];
};

function formLabelForLocale(
  formTitle: string,
  translations: Array<{ locale: string; title?: string | null }>,
  locale: string | null,
): string {
  if (!locale) return formTitle;
  const code = locale.toLowerCase();
  const row = translations.find((t) => String(t.locale || '').toLowerCase() === code);
  const translated = row?.title?.trim();
  return translated || formTitle;
}

function mapSubmission(raw: Record<string, unknown>): SubmissionRow {
  return {
    id: Number(raw.id),
    status: String(raw.status ?? 'new'),
    locale: (raw.locale as string | null) ?? null,
    ip_address: (raw.ip_address as string | null) ?? null,
    payload:
      raw.payload && typeof raw.payload === 'object'
        ? (raw.payload as Record<string, unknown>)
        : {},
    created_at: String(raw.created_at ?? ''),
  };
}

function normalizeSubmissions(body: unknown): SubmissionRow[] {
  if (Array.isArray(body)) {
    return body.map((x) => mapSubmission(x as Record<string, unknown>));
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data).map((x) => mapSubmission(x as Record<string, unknown>));
  }
  return [];
}

export const useFormSubmissions = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const [formRes, subRes] = await Promise.all([
      api.get(API_ENDPOINTS.FORMS.GET(id)),
      api.get(`${API_ENDPOINTS.FORMS.SUBMISSIONS(id)}?per_page=50`),
    ]);
    const formBody = ((formRes as { data?: unknown })?.data ?? formRes) as Record<string, unknown>;
    const subBody = (subRes as { data?: unknown })?.data ?? subRes;
    return {
      formId: id,
      formTitle: String(formBody.title ?? ''),
      formSlug: String(formBody.slug ?? ''),
      formTranslations: Array.isArray(formBody.translations)
        ? (formBody.translations as Array<{ locale: string; title?: string | null }>)
        : [],
      formLayout: formBody.layout ?? { rows: [] },
      submissions: normalizeSubmissions(subBody),
    } satisfies SubmissionsPageData;
  } catch {
    return fail(404, { message: 'Form not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();
  const page = useFormSubmissions().value as SubmissionsPageData;
  const rows = useSignal<SubmissionRow[]>(page.submissions);
  const exportHref = useSignal('');
  const viewing = useSignal<SubmissionRow | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const base = getConfig().api.baseUrl.replace(/\/+$/, '');
    exportHref.value = `${base}${API_ENDPOINTS.FORMS.SUBMISSIONS_EXPORT(page.formId)}`;
  });

  const onStatusChange$ = $(async (id: number, status: string) => {
    try {
      const api = getApiClient(null);
      await api.patch(API_ENDPOINTS.FORMS.SUBMISSION(page.formId, id), { status });
      rows.value = rows.value.map((r) => (r.id === id ? { ...r, status } : r));
      await success(translateApp(lang, 'common.updated'));
    } catch (err) {
      await showError(
        String((err as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  const onDelete$ = $(async (id: number) => {
    const result = await confirm(translateApp(lang, 'forms.submissionDeleteConfirm'), {
      title: translateApp(lang, 'common.delete'),
    });
    if (!(result as { isConfirmed?: boolean })?.isConfirmed) return;
    try {
      const api = getApiClient(null);
      await api.delete(API_ENDPOINTS.FORMS.SUBMISSION(page.formId, id));
      rows.value = rows.value.filter((r) => r.id !== id);
      if (viewing.value?.id === id) {
        viewing.value = null;
      }
      await success(translateApp(lang, 'common.deleted'));
    } catch (err) {
      await showError(
        String((err as { message?: string })?.message || translateApp(lang, 'common.error')),
      );
    }
  });

  const closeView$ = $(() => {
    viewing.value = null;
  });

  return (
    <div class="space-y-4">
      <PageHeader
        title={translateApp(lang, 'forms.submissionsTitle')}
        description={`${page.formTitle} (${page.formSlug})`}
      >
        <div class="flex flex-wrap gap-2">
          {exportHref.value ? (
            <a
              href={exportHref.value}
              class={ADMIN_PRIMARY_BUTTON_CLASS}
              target="_blank"
              rel="noopener noreferrer"
            >
              {translateApp(lang, 'forms.exportCsv')}
            </a>
          ) : null}
          <Link href={adminFormBuilderHref(lang, page.formId)} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'forms.openBuilder')}
          </Link>
          <Link href={adminFormEditHref(lang, page.formId)} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'forms.edit')}
          </Link>
          <Link href={R.ADMIN.FORMS} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'common.back')}
          </Link>
        </div>
      </PageHeader>

      {rows.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'forms.submissionsEmptyTitle')}
          description={translateApp(lang, 'forms.submissionsEmpty')}
        />
      ) : (
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900">
          <table class="min-w-full text-start text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-slate-950">
              <tr>
                <th class="px-3 py-2">ID</th>
                <th class="px-3 py-2">{translateApp(lang, 'forms.formLabel')}</th>
                <th class="px-3 py-2">{translateApp(lang, 'forms.fields.status')}</th>
                <th class="px-3 py-2">{translateApp(lang, 'forms.submissionLocale')}</th>
                <th class="px-3 py-2">{translateApp(lang, 'forms.submissionDate')}</th>
                <th class="px-3 py-2 text-end">{translateApp(lang, 'common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.value.map((row) => (
                <tr key={row.id} class="border-b border-gray-100 dark:border-gray-800">
                  <td class="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {formLabelForLocale(page.formTitle, page.formTranslations, row.locale)}
                  </td>
                  <td class="px-3 py-2">
                    <select
                      class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
                      value={row.status}
                      onChange$={(e) => {
                        void onStatusChange$(row.id, (e.target as HTMLSelectElement).value);
                      }}
                    >
                      {['new', 'read', 'spam', 'archived'].map((s) => (
                        <option key={s} class={ADMIN_NATIVE_OPTION_CLASS} value={s}>
                          {translateApp(lang, `forms.submissionStatus.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td class="px-3 py-2 text-gray-500">{row.locale || '—'}</td>
                  <td class="px-3 py-2 text-gray-500 whitespace-nowrap">{row.created_at}</td>
                  <td class="px-3 py-2 text-end">
                    <div class="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        onClick$={() => {
                          viewing.value = row;
                        }}
                      >
                        {translateApp(lang, 'forms.viewSubmission')}
                      </button>
                      <button
                        type="button"
                        class="text-xs text-red-600"
                        onClick$={() => onDelete$(row.id)}
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

      {viewing.value ? (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-view-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            class="absolute inset-0 bg-black/50"
            aria-label={translateApp(lang, 'common.close')}
            onClick$={closeView$}
          />
          <div class="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-slate-900">
            <div class="flex flex-shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h2
                  id="submission-view-title"
                  class="text-base font-semibold text-gray-900 dark:text-gray-100"
                >
                  {translateApp(lang, 'forms.viewSubmissionTitle')} #{viewing.value.id}
                </h2>
                <p class="mt-0.5 text-xs text-gray-500">
                  {viewing.value.locale || '—'} · {viewing.value.created_at}
                </p>
              </div>
              <button
                type="button"
                class={ADMIN_BACK_BUTTON_CLASS}
                onClick$={closeView$}
              >
                {translateApp(lang, 'common.close')}
              </button>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <SubmissionPayloadView
                lang={lang}
                payload={viewing.value.payload}
                formLayout={page.formLayout}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export const head: DocumentHead = ({ params }) => ({
  title: translateApp(String(params.lang || 'en'), 'forms.submissionsTitle'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
