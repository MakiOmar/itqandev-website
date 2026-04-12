import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { ROUTES } from '../../../lib/constants/routes';
import type { AdminService } from '../../../types/service';
import { useSiteLanguageConfig } from '../layout';
import { useLocaleAwareList } from '../../../lib/hooks/useLocaleAwareList';
import { primaryLocaleForContent } from '../../../lib/content-display-locale';
import { useDeleteService, useBulkDeleteServices } from '../../../lib/admin/service-actions';

type ServicesListPayload = {
  data: AdminService[];
};

function mapServiceFromApi(raw: Record<string, unknown>): AdminService {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    content_locale: (raw.content_locale as string | null) ?? null,
    short_description: (raw.short_description as string | null) ?? '',
    description: (raw.description as string | null) ?? '',
    process: Array.isArray(raw.process) ? (raw.process as string[]) : [],
    deliverables: Array.isArray(raw.deliverables) ? (raw.deliverables as string[]) : [],
    icon: (raw.icon as string | null) ?? '',
    sort_order: Number(raw.sort_order ?? 0),
    is_published: Boolean(raw.is_published ?? true),
    translations: Array.isArray(raw.translations) ? (raw.translations as AdminService['translations']) : [],
    createdAt: (raw.created_at as string) ?? (raw.createdAt as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? (raw.updatedAt as string) ?? '',
  };
}

export const useServices = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<AdminService[]>(API_ENDPOINTS.SERVICES.LIST);
    let body: unknown = (response as any)?.data ?? response;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return [];
      }
    }
    if (body && typeof body === 'object' && 'data' in (body as any) && Array.isArray((body as any).data)) {
      return (body as ServicesListPayload).data.map((x) => mapServiceFromApi(x as unknown as Record<string, unknown>));
    }
    if (Array.isArray(body)) {
      return (body as unknown[]).map((x) => mapServiceFromApi(x as Record<string, unknown>));
    }
    return [];
  } catch (e: any) {
    console.error('Failed to load services:', e);
    return [];
  }
});

export default component$(() => {
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const services = useServices();
  const langConfig = useSiteLanguageConfig();

  const { items: servicesState, loading } = useLocaleAwareList<AdminService>(
    services,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get<AdminService[]>(API_ENDPOINTS.SERVICES.LIST).then((res: any) => {
        const body = res?.data ?? res;
        if (Array.isArray(body)) {
          return body.map((x: any) => mapServiceFromApi(x));
        }
        if (body && Array.isArray(body.data)) {
          return body.data.map((x: any) => mapServiceFromApi(x));
        }
        return [];
      });
    }),
  );

  const deleteAction = useDeleteService();
  const bulkDeleteAction = useBulkDeleteServices();

  const translations = {
    success: t('common.success'),
    deleted: t('common.deleted'),
    delete: t('common.delete'),
    deleteConfirm: t('services.deleteConfirm'),
  };

  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (svc: AdminService): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      svc.content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (svc: AdminService): string => {
    const rows = svc.translations;
    const locales = Array.isArray(rows)
      ? Array.from(
          new Set(rows.map((r) => String(r?.locale ?? '').trim().toLowerCase()).filter((x) => x.length > 0)),
        )
      : [];
    if (locales.length === 0) {
      return String(t('contentTranslations.noSecondaryLanguages') || '—');
    }
    const labels = locales.map((code) => `${languageLabelByCode.get(code) || code} (${code})`);
    return `${locales.length}: ${labels.join(', ')}`;
  };

  const filtered = useComputed$(() => {
    const list = servicesState.value || [];
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.slug ?? '').toLowerCase().includes(q) ||
        (s.short_description ?? '').toLowerCase().includes(q),
    );
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const submitWithFormData = $(async (action: any, fields: Record<string, any>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) {
        continue;
      }
      if (Array.isArray(v)) {
        for (const item of v) {
          fd.append(`${k}[]`, String(item));
        }
      } else {
        fd.append(k, String(v));
      }
    }
    await action.submit(fd);
    return (action as any).value;
  });

  const handleDelete = $(async (svc: AdminService) => {
    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) {
      return;
    }
    const val = await submitWithFormData(deleteAction, { id: String(svc.id) });
    if (val?.failed) {
      await showError(val.message || 'Failed to delete service');
      return;
    }
    await success(translations.success, { text: translations.deleted });
    servicesState.value = servicesState.value.filter((s) => s.id !== svc.id);
    selectedItems.value = selectedItems.value.filter((id) => id !== String(svc.id));
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) {
      return;
    }
    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) {
      return;
    }
    const val = await submitWithFormData(bulkDeleteAction, { ids: selectedItems.value });
    if (val?.failed) {
      await showError(val.message || 'Failed to delete services');
      return;
    }
    await success(translations.success, { text: translations.deleted });
    const toDelete = new Set(selectedItems.value);
    servicesState.value = servicesState.value.filter((s) => !toDelete.has(String(s.id)));
    selectedItems.value = [];
  });

  const toggleSelect = $((id: string) => {
    const next = [...selectedItems.value];
    const index = next.indexOf(id);
    if (index > -1) {
      next.splice(index, 1);
    } else {
      next.push(id);
    }
    selectedItems.value = next;
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  return (
    <>
      <PageHeader title={t('services.title')} description={t('services.subtitle')}>
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
            href={ROUTES.ADMIN.SERVICES_NEW}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {t('services.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('services.list')}</h2>
        <div class="mb-4">
          <input
            type="text"
            value={searchQuery.value}
            onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
            placeholder={t('common.search')}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>

        {loading.value ? (
          <div class="py-6 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : filtered.value.length === 0 ? (
          <EmptyState title={t('services.empty')} />
        ) : (
          <ul class="space-y-2">
            {filtered.value.map((svc) => (
              <li
                key={svc.id}
                class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
              >
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.value.includes(String(svc.id))}
                    onChange$={() => toggleSelect(String(svc.id))}
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{svc.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {t('services.slug')}: {svc.slug}
                      {svc.icon ? ` · ${t('services.icon')}: ${svc.icon}` : ''}
                    </p>
                    {svc.short_description && (
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{svc.short_description}</p>
                    )}
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                        {t('contentTranslations.contentPrimaryLanguage')}: {mainLocaleLabel(svc)}
                      </span>
                      <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                        {t('contentTranslations.addTranslations')}: {translationsLabel(svc)}
                      </span>
                    </div>
                    {!svc.is_published && (
                      <span class="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                        {t('services.draft')}
                      </span>
                    )}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">#{svc.sort_order ?? 0}</span>
                  <Link
                    href={ROUTES.ADMIN.SERVICES_EDIT(svc.id)}
                    class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                  >
                    {t('common.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick$={() => handleDelete(svc)}
                    class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {t('common.delete')}
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
  title: 'Services - Dashboard',
  meta: [{ name: 'description', content: 'Manage services' }],
};
