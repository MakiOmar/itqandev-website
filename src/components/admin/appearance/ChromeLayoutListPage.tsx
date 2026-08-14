import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { EmptyState } from '~/components/common/EmptyState';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminFooterBuilderHref,
  adminFooterEditHref,
  adminHeaderBuilderHref,
  adminHeaderEditHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import {
  deleteChromeLayoutFromBrowser,
  fetchChromeLayoutsFromBrowser,
  setChromeLayoutSiteDefaultFromBrowser,
} from '~/lib/admin/chrome-layout-actions';
import type { ChromeLayoutKind, ChromeLayoutMeta } from '~/types/chrome-layout';
import {
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_BACK_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

export const ChromeLayoutListPage = component$<{
  kind: ChromeLayoutKind;
  initialItems: ChromeLayoutMeta[];
}>(({ kind, initialItems }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { confirm, success, error: showError } = useSwal();
  const items = useSignal<ChromeLayoutMeta[]>(initialItems);
  const title =
    kind === 'header'
      ? translateApp(lang, 'sidebar.appearanceHeader')
      : translateApp(lang, 'sidebar.appearanceFooter');
  const newHref =
    kind === 'header' ? R.ADMIN.APPEARANCE_HEADER_NEW : R.ADMIN.APPEARANCE_FOOTER_NEW;

  const refetch$ = $(async () => {
    items.value = await fetchChromeLayoutsFromBrowser(kind);
  });

  const editHref = (id: number) =>
    kind === 'header' ? adminHeaderEditHref(lang, id) : adminFooterEditHref(lang, id);
  const builderHref = (id: number) =>
    kind === 'header' ? adminHeaderBuilderHref(lang, id) : adminFooterBuilderHref(lang, id);

  return (
    <div class="space-y-4">
      <PageHeader title={title}>
        <Link href={R.ADMIN.APPEARANCE_CHROME_DEFAULTS} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'chromeLayouts.typeDefaults')}
        </Link>
        <Link href={newHref} class={ADMIN_PRIMARY_BUTTON_CLASS}>
          {translateApp(lang, 'common.create')}
        </Link>
      </PageHeader>

      {items.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'chromeLayouts.emptyTitle')}
          description={translateApp(lang, 'chromeLayouts.emptyHint')}
        />
      ) : (
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-950/60">
              <tr>
                <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(lang, 'common.name')}
                </th>
                <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(lang, 'common.status')}
                </th>
                <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(lang, 'chromeLayouts.siteDefault')}
                </th>
                <th class="px-4 py-3 text-end font-medium text-gray-600 dark:text-gray-300">
                  {translateApp(lang, 'common.actions')}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {items.value.map((row) => (
                <tr key={row.id}>
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                    <div class="text-xs text-gray-500">{row.slug}</div>
                  </td>
                  <td class="px-4 py-3 capitalize text-gray-700 dark:text-gray-300">{row.status}</td>
                  <td class="px-4 py-3">
                    {row.is_site_default ? (
                      <span class="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                        {translateApp(lang, 'chromeLayouts.siteDefault')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                        disabled={row.status !== 'published'}
                        onClick$={async () => {
                          const res = await setChromeLayoutSiteDefaultFromBrowser(kind, row.id);
                          if (!res.success) {
                            await showError(res.error || translateApp(lang, 'common.error'));
                            return;
                          }
                          await success(translateApp(lang, 'common.saved'));
                          await refetch$();
                        }}
                      >
                        {translateApp(lang, 'chromeLayouts.makeSiteDefault')}
                      </button>
                    )}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap justify-end gap-2">
                      <Link href={builderHref(row.id)} class="text-primary-600 hover:underline">
                        {translateApp(lang, 'pages.openBuilder')}
                      </Link>
                      <Link href={editHref(row.id)} class="text-gray-600 hover:underline dark:text-gray-300">
                        {translateApp(lang, 'common.edit')}
                      </Link>
                      <button
                        type="button"
                        class="text-red-600 hover:underline"
                        onClick$={async () => {
                          const swal = await confirm(translateApp(lang, 'chromeLayouts.deleteConfirm'), {
                            title: translateApp(lang, 'common.delete'),
                          });
                          if (!(swal as { isConfirmed?: boolean })?.isConfirmed) return;
                          const res = await deleteChromeLayoutFromBrowser(kind, row.id);
                          if (!res.success) {
                            await showError(res.error || translateApp(lang, 'common.error'));
                            return;
                          }
                          await success(translateApp(lang, 'common.deleted'));
                          await refetch$();
                        }}
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
  );
});
