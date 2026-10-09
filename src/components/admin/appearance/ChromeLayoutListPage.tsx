import { component$, useSignal, useComputed$, $ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { EmptyState } from '~/components/common/EmptyState';
import {
  AdminRowActionsMenu,
  ADMIN_ROW_ACTION_DANGER_CLASS,
  ADMIN_ROW_ACTION_ITEM_CLASS,
} from '~/components/admin/AdminRowActionsMenu';
import { ChromeLayoutImportExportButtons } from '~/components/admin/appearance/ChromeLayoutImportExportButtons';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { showToast } from '~/lib/utils/toast';
import {
  adminChromeBuilderHref,
  adminChromeEditHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import {
  bulkDeleteChromeLayoutsFromBrowser,
  bulkSetChromeLayoutStatusFromBrowser,
  deleteChromeLayoutFromBrowser,
  downloadChromeLayoutsExportFromBrowser,
  fetchChromeLayoutsFromBrowser,
  setChromeLayoutSiteDefaultFromBrowser,
  type ChromeLayoutBulkResult,
} from '~/lib/admin/chrome-layout-actions';
import type { ChromeLayoutKind, ChromeLayoutMeta, ChromeLayoutStatus } from '~/types/chrome-layout';
import {
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_CHECKBOX_CLASS,
} from '~/lib/admin/native-select-classes';

const TITLE_KEYS: Record<ChromeLayoutKind, string> = {
  header: 'sidebar.appearanceHeader',
  footer: 'sidebar.appearanceFooter',
  body: 'sidebar.appearanceBody',
  single: 'sidebar.appearanceSingles',
  archive: 'sidebar.appearanceArchives',
  loop_item: 'sidebar.appearanceLoopItems',
  overlay: 'sidebar.appearanceOverlays',
};

const NEW_ROUTE_KEYS = {
  header: 'APPEARANCE_HEADER_NEW',
  footer: 'APPEARANCE_FOOTER_NEW',
  body: 'APPEARANCE_BODY_NEW',
  single: 'APPEARANCE_SINGLES_NEW',
  archive: 'APPEARANCE_ARCHIVES_NEW',
  loop_item: 'APPEARANCE_LOOP_ITEMS_NEW',
  overlay: 'APPEARANCE_OVERLAYS_NEW',
} as const;

const BULK_BTN =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800';

/** Toast the outcome of a bulk call, including rows the server refused (site default, in use). */
function toastBulkResult(lang: string, res: ChromeLayoutBulkResult, doneKey: string): void {
  if (!res.success) {
    showToast(res.error || translateApp(lang, 'common.error'), 'error');
    return;
  }
  const done = translateApp(lang, doneKey, { count: String(res.count) });
  if (res.skipped === 0) {
    showToast(done, 'success');
    return;
  }
  const skipped = translateApp(lang, 'chromeLayouts.bulkSkipped', {
    count: String(res.skipped),
    details: res.errors.slice(0, 3).join('; '),
  });
  showToast(`${done} ${skipped}`, 'warning', 8000);
}

export const ChromeLayoutListPage = component$<{
  kind: ChromeLayoutKind;
  initialItems: ChromeLayoutMeta[];
}>(({ kind, initialItems }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { confirm } = useSwal();
  const items = useSignal<ChromeLayoutMeta[]>(initialItems);
  const selected = useSignal<number[]>([]);
  const busy = useSignal(false);
  const allIds = useComputed$(() => items.value.map((row) => row.id));
  const showSiteDefault = kind === 'header' || kind === 'footer';

  const refetch$ = $(async () => {
    items.value = await fetchChromeLayoutsFromBrowser(kind);
    const ids = new Set(items.value.map((row) => row.id));
    selected.value = selected.value.filter((id) => ids.has(id));
  });

  const onDelete$ = $(async (id: number) => {
    const answer = await confirm(translateApp(lang, 'chromeLayouts.deleteConfirm'), {
      title: translateApp(lang, 'common.delete'),
    });
    if (!answer.isConfirmed) return;
    const res = await deleteChromeLayoutFromBrowser(kind, id);
    if (!res.success) {
      showToast(res.error || translateApp(lang, 'common.error'), 'error');
      return;
    }
    showToast(translateApp(lang, 'common.deleted'), 'success');
    await refetch$();
  });

  const onSetDefault$ = $(async (id: number) => {
    const res = await setChromeLayoutSiteDefaultFromBrowser(kind, id);
    if (!res.success) {
      showToast(res.error || translateApp(lang, 'common.error'), 'error');
      return;
    }
    showToast(translateApp(lang, 'common.saved'), 'success');
    await refetch$();
  });

  const onExportRow$ = $(async (id: number, filenameBase: string) => {
    const res = await downloadChromeLayoutsExportFromBrowser(kind, filenameBase, [id]);
    if (!res.success) showToast(res.error || translateApp(lang, 'common.error'), 'error');
  });

  const onBulkStatus$ = $(async (status: ChromeLayoutStatus) => {
    if (busy.value || selected.value.length === 0) return;
    busy.value = true;
    try {
      const ids = [...selected.value];
      const res = await bulkSetChromeLayoutStatusFromBrowser(kind, ids, status);
      toastBulkResult(lang, res, 'chromeLayouts.bulkUpdated');
      if (!res.success) return;
      // Refused rows (in use) keep their status; refetch only when something was skipped.
      if (res.skipped > 0) {
        await refetch$();
      } else {
        items.value = items.value.map((row) => (ids.includes(row.id) ? { ...row, status } : row));
      }
    } finally {
      busy.value = false;
    }
  });

  const onBulkDelete$ = $(async () => {
    if (busy.value || selected.value.length === 0) return;
    const answer = await confirm(
      translateApp(lang, 'chromeLayouts.bulkDeleteConfirm', { count: String(selected.value.length) }),
      { title: translateApp(lang, 'common.delete'), icon: 'warning' },
    );
    if (!answer.isConfirmed) return;
    busy.value = true;
    try {
      const res = await bulkDeleteChromeLayoutsFromBrowser(kind, [...selected.value]);
      toastBulkResult(lang, res, 'chromeLayouts.bulkDeleted');
      if (res.success) await refetch$();
    } finally {
      busy.value = false;
    }
  });

  const toggleRow$ = $((id: number, checked: boolean) => {
    selected.value = checked ? [...selected.value, id] : selected.value.filter((x) => x !== id);
  });

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, TITLE_KEYS[kind])}>
        <div class="flex flex-wrap gap-2">
          <ChromeLayoutImportExportButtons
            lang={lang}
            kind={kind}
            selectedIds={selected}
            busy={busy}
            onImported$={refetch$}
          />
          <Link href={R.ADMIN.APPEARANCE_CHROME_DEFAULTS} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'chromeLayouts.typeDefaults')}
          </Link>
          <Link href={R.ADMIN[NEW_ROUTE_KEYS[kind]]} class={ADMIN_PRIMARY_BUTTON_CLASS}>
            {translateApp(lang, 'common.create')}
          </Link>
        </div>
      </PageHeader>

      {items.value.length === 0 ? (
        <EmptyState
          title={translateApp(lang, 'chromeLayouts.emptyTitle')}
          description={translateApp(lang, 'chromeLayouts.emptyHint')}
        />
      ) : (
        <>
          {/* Bulk actions bar: only while rows are selected */}
          {selected.value.length > 0 ? (
            <div class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              <span class="me-2 font-medium text-gray-700 dark:text-gray-200">
                {selected.value.length} {translateApp(lang, 'common.selected')}
              </span>
              <button type="button" class={BULK_BTN} disabled={busy.value} onClick$={() => onBulkStatus$('published')}>
                {translateApp(lang, 'chromeLayouts.publishSelected')}
              </button>
              <button type="button" class={BULK_BTN} disabled={busy.value} onClick$={() => onBulkStatus$('draft')}>
                {translateApp(lang, 'chromeLayouts.draftSelected')}
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                disabled={busy.value}
                onClick$={onBulkDelete$}
              >
                {translateApp(lang, 'common.delete')}
              </button>
              <button type="button" class={BULK_BTN} disabled={busy.value} onClick$={() => (selected.value = [])}>
                {translateApp(lang, 'common.cancel')}
              </button>
            </div>
          ) : null}

          <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-950/60">
                <tr>
                  <th scope="col" class="w-10 px-4 py-3 text-start">
                    <input
                      type="checkbox"
                      class={ADMIN_CHECKBOX_CLASS}
                      aria-label={translateApp(lang, 'common.selectAll')}
                      checked={allIds.value.length > 0 && selected.value.length === allIds.value.length}
                      onChange$={(e) => {
                        selected.value = (e.target as HTMLInputElement).checked ? [...allIds.value] : [];
                      }}
                    />
                  </th>
                  <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'common.name')}
                  </th>
                  <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'common.status')}
                  </th>
                  {showSiteDefault ? (
                    <th class="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">
                      {translateApp(lang, 'chromeLayouts.siteDefault')}
                    </th>
                  ) : null}
                  <th class="px-4 py-3 text-end font-medium text-gray-600 dark:text-gray-300">
                    {translateApp(lang, 'common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {items.value.map((row) => {
                  const id = row.id;
                  const fileBase = row.slug || row.name;
                  return (
                    <tr key={id}>
                      <td class="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          class={ADMIN_CHECKBOX_CLASS}
                          aria-label={row.name}
                          checked={selected.value.includes(row.id)}
                          onChange$={(e) => toggleRow$(id, (e.target as HTMLInputElement).checked)}
                        />
                      </td>
                      <td class="px-4 py-3">
                        <div class="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                        <div class="text-xs text-gray-500">{row.slug}</div>
                      </td>
                      <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {translateApp(lang, row.status === 'published' ? 'chromeLayouts.statusPublished' : 'chromeLayouts.statusDraft')}
                      </td>
                      {showSiteDefault ? (
                        <td class="px-4 py-3">
                          {row.is_site_default ? (
                            <span class="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                              {translateApp(lang, 'chromeLayouts.siteDefault')}
                            </span>
                          ) : (
                            <span class="text-gray-400">—</span>
                          )}
                        </td>
                      ) : null}
                      <td class="px-4 py-3 text-end">
                        {/* Row actions dropdown */}
                        <AdminRowActionsMenu label={`${translateApp(lang, 'common.actions')}: ${row.name}`}>
                          <Link role="menuitem" href={adminChromeBuilderHref(lang, kind, row.id)} class={ADMIN_ROW_ACTION_ITEM_CLASS}>
                            {translateApp(lang, 'pages.openBuilder')}
                          </Link>
                          <Link role="menuitem" href={adminChromeEditHref(lang, kind, row.id)} class={ADMIN_ROW_ACTION_ITEM_CLASS}>
                            {translateApp(lang, 'common.edit')}
                          </Link>
                          {showSiteDefault && !row.is_site_default && row.status === 'published' ? (
                            <button type="button" role="menuitem" class={ADMIN_ROW_ACTION_ITEM_CLASS} onClick$={() => onSetDefault$(id)}>
                              {translateApp(lang, 'chromeLayouts.makeSiteDefault')}
                            </button>
                          ) : null}
                          <button type="button" role="menuitem" class={ADMIN_ROW_ACTION_ITEM_CLASS} onClick$={() => onExportRow$(id, fileBase)}>
                            {translateApp(lang, 'chromeLayouts.exportOne')}
                          </button>
                          {row.is_site_default ? null : (
                            <>
                              <div class="my-1 border-t border-gray-100 dark:border-gray-700" role="separator" />
                              <button type="button" role="menuitem" class={ADMIN_ROW_ACTION_DANGER_CLASS} onClick$={() => onDelete$(id)}>
                                {translateApp(lang, 'common.delete')}
                              </button>
                            </>
                          )}
                        </AdminRowActionsMenu>
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
