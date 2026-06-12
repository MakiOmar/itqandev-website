import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { adminFontEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import { extractFontsList, deleteFont } from '../../../../lib/admin/font-api';
import { presentFontFormats, type SiteFont } from '../../../../types/font';

export const useFontsList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get<unknown>(`${API_ENDPOINTS.FONTS.LIST}?per_page=100`);
    return extractFontsList(res);
  } catch (e) {
    console.error('Failed to load fonts:', e);
    return [] as SiteFont[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();
  const loader = useFontsList();
  const fonts = useSignal<SiteFont[]>(loader.value);
  const searchQuery = useSignal('');

  const filtered = useComputed$(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const list = fonts.value ?? [];
    if (!q) {
      return list;
    }
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.css_family.toLowerCase().includes(q),
    );
  });

  const handleDelete = $(async (font: SiteFont) => {
    const result = await confirm(String(translateApp(lang, 'fonts.deleteConfirm')), {
      icon: 'warning',
      title: String(translateApp(lang, 'common.confirm')),
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await deleteFont(font.id);
      fonts.value = fonts.value.filter((f) => f.id !== font.id);
      await success(String(translateApp(lang, 'common.deleted')));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(translateApp(lang, 'fonts.deleteFailed'));
      await showError(msg);
    }
  });

  return (
    <div>
      <PageHeader
        title={translateApp(lang, 'fonts.title')}
        description={translateApp(lang, 'fonts.subtitle')}
      >
        <Link
          href={R.ADMIN.FONTS_NEW}
          class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {translateApp(lang, 'fonts.add')}
        </Link>
      </PageHeader>

      <div class="mb-4">
        <input
          type="search"
          placeholder={translateApp(lang, 'common.search')}
          value={searchQuery.value}
          onInput$={(e) => {
            searchQuery.value = (e.target as HTMLInputElement).value;
          }}
          class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {filtered.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'fonts.emptyTitle')}
          description={translateApp(lang, 'fonts.emptyDescription')}
        />
      ) : (
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{translateApp(lang, 'fonts.name')}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{translateApp(lang, 'fonts.cssFamily')}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{translateApp(lang, 'fonts.formats')}</th>
                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">{translateApp(lang, 'common.actions')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.value.map((font) => (
                <tr key={font.id}>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{font.name}</td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{font.css_family}</td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {presentFontFormats(font).join(', ') || '—'}
                  </td>
                  <td class="px-4 py-3 text-right text-sm">
                    <Link
                      href={adminFontEditHref(lang, font.id)}
                      class="mr-3 text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {translateApp(lang, 'common.edit')}
                    </Link>
                    <button
                      type="button"
                      class="text-red-600 hover:underline dark:text-red-400"
                      onClick$={() => handleDelete(font)}
                    >
                      {translateApp(lang, 'common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Fonts - Dashboard',
};
