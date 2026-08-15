import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { EmptyState } from '~/components/common/EmptyState';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { adminThemeTemplateEditHref, getLocalizedRoutes } from '~/lib/constants/routes';
import {
  deleteThemeTemplateFromBrowser,
  fetchThemeTemplatesFromBrowser,
  summarizeThemeConditions,
} from '~/lib/admin/theme-template-actions';
import type { ThemeTemplateMeta } from '~/types/chrome-layout';
import {
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

export const ThemeTemplateListPage = component$<{
  initialItems: ThemeTemplateMeta[];
}>(({ initialItems }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { confirm, success, error: showError } = useSwal();
  const items = useSignal<ThemeTemplateMeta[]>(initialItems);

  const refetch$ = $(async () => {
    items.value = await fetchThemeTemplatesFromBrowser();
  });

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, 'sidebar.appearanceThemeBuilder')}>
        <Link href={R.ADMIN.APPEARANCE_THEME_BUILDER_NEW} class={ADMIN_PRIMARY_BUTTON_CLASS}>
          {translateApp(lang, 'common.create')}
        </Link>
      </PageHeader>

      {items.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'themeBuilder.emptyTitle')}
          description={translateApp(lang, 'themeBuilder.emptyHint')}
        />
      ) : (
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.value.map((row) => (
            <div
              key={row.id}
              class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">{row.name}</h3>
                  <p class="mt-1 text-xs capitalize text-gray-500">{row.status}</p>
                </div>
                <span
                  class={[
                    'rounded px-2 py-0.5 text-xs font-medium',
                    row.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                  ].join(' ')}
                >
                  {row.status}
                </span>
              </div>
              <p class="mt-3 line-clamp-3 text-xs text-gray-600 dark:text-gray-400">
                {summarizeThemeConditions(row.conditions)}
              </p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>{translateApp(lang, 'themeBuilder.slotHeader')}: {row.header_layout_id ?? '—'}</span>
                <span>{translateApp(lang, 'themeBuilder.slotBody')}: {row.body_layout_id ?? '—'}</span>
                <span>{translateApp(lang, 'themeBuilder.slotFooter')}: {row.footer_layout_id ?? '—'}</span>
              </div>
              <div class="mt-4 flex flex-wrap gap-3">
                <Link
                  href={adminThemeTemplateEditHref(lang, row.id)}
                  class="text-sm text-primary-600 hover:underline"
                >
                  {translateApp(lang, 'common.edit')}
                </Link>
                <button
                  type="button"
                  class="text-sm text-red-600 hover:underline"
                  onClick$={async () => {
                    const swal = await confirm(translateApp(lang, 'themeBuilder.deleteConfirm'), {
                      title: translateApp(lang, 'common.delete'),
                    });
                    if (!(swal as { isConfirmed?: boolean })?.isConfirmed) return;
                    const res = await deleteThemeTemplateFromBrowser(row.id);
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
