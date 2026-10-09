import { component$, useSignal, useComputed$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { adminUserEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import { showError as showErrorToast, showSuccess as showSuccessToast } from '../../../../lib/utils/toast';
import {
  loadUsers,
  runUserBulkDeleteFromBrowser,
  runUserBulkStatusFromBrowser,
  runUserDeleteFromBrowser,
  type AdminUser,
  type AdminUserStatus,
} from '../../../../lib/admin/user-actions';
import { ADMIN_CHECKBOX_CLASS } from '../../../../lib/admin/native-select-classes';
import {
  AdminRowActionsMenu,
  ADMIN_ROW_ACTION_DANGER_CLASS,
  ADMIN_ROW_ACTION_ITEM_CLASS,
} from '../../../../components/admin/AdminRowActionsMenu';
import { useAdminAuth } from '../layout';

export const useUsersList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    return { users: await loadUsers(adminApiClient(cookie, request, params.lang)), error: null as string | null };
  } catch (err: unknown) {
    console.error('Failed to load users:', err);
    return { users: [] as AdminUser[], error: (err as Error)?.message || 'Failed to load users' };
  }
});

const BTN_SECONDARY =
  'rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800';

/**
 * Users list (Admin only). Create and edit live on `users/new` and `users/[id]`.
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm } = useSwal();
  const listLoader = useUsersList();
  const session = useAdminAuth();
  const currentUserId = Number(session.value?.user?.id ?? 0);

  const users = useSignal<AdminUser[]>(listLoader.value.users);
  const searchQuery = useSignal('');
  const selectedItems = useSignal<string[]>([]);
  const bulkRunning = useSignal(false);

  const filteredUsers = useComputed$(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return users.value;
    return users.value.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r) => r.name.toLowerCase().includes(q)),
    );
  });

  const text = {
    deleteConfirm: String(translateApp(lang, 'users.deleteConfirm')),
    bulkDeleteConfirm: String(translateApp(lang, 'users.bulkDeleteConfirm')),
    deleteTitle: String(translateApp(lang, 'common.delete')),
    deleted: String(translateApp(lang, 'common.deleted')),
    bulkDeleted: String(translateApp(lang, 'users.bulkDeleted')),
    activated: String(translateApp(lang, 'users.bulkActivated')),
    deactivated: String(translateApp(lang, 'users.bulkDeactivated')),
    deleteSelf: String(translateApp(lang, 'users.deleteSelfError')),
  };

  const toggleSelect = $((id: string) => {
    const set = new Set(selectedItems.value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    selectedItems.value = [...set];
  });

  const selectAll = $(() => {
    selectedItems.value = filteredUsers.value.filter((u) => u.id !== currentUserId).map((u) => String(u.id));
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  const handleDelete = $(async (user: AdminUser) => {
    if (user.id === currentUserId) {
      showErrorToast(text.deleteSelf);
      return;
    }
    const result = await confirm(text.deleteConfirm, { icon: 'warning', title: text.deleteTitle });
    if (!result.isConfirmed) return;

    const deleted = await runUserDeleteFromBrowser(user.id);
    if (!deleted.ok) {
      showErrorToast(deleted.message);
      return;
    }
    users.value = users.value.filter((u) => u.id !== user.id);
    selectedItems.value = selectedItems.value.filter((id) => id !== String(user.id));
    showSuccessToast(text.deleted);
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0 || bulkRunning.value) return;
    const result = await confirm(text.bulkDeleteConfirm.replace('{count}', String(selectedItems.value.length)), {
      icon: 'warning',
      title: text.deleteTitle,
    });
    if (!result.isConfirmed) return;

    bulkRunning.value = true;
    const ids = [...selectedItems.value];
    const deleted = await runUserBulkDeleteFromBrowser(ids);
    bulkRunning.value = false;
    if (!deleted.ok) {
      showErrorToast(deleted.message);
      return;
    }
    // The API never deletes the acting user, so keep that row even if it was selected.
    const removed = new Set(ids.filter((id) => Number(id) !== currentUserId));
    users.value = users.value.filter((u) => !removed.has(String(u.id)));
    selectedItems.value = [];
    showSuccessToast(text.bulkDeleted.replace('{count}', String(deleted.count)));
  });

  const handleBulkStatus = $(async (status: AdminUserStatus) => {
    if (selectedItems.value.length === 0 || bulkRunning.value) return;
    bulkRunning.value = true;
    const ids = [...selectedItems.value];
    const res = await runUserBulkStatusFromBrowser(ids, status);
    bulkRunning.value = false;
    if (!res.ok) {
      showErrorToast(res.message);
      return;
    }
    const changed = new Set(ids.filter((id) => status === 'active' || Number(id) !== currentUserId));
    users.value = users.value.map((u) => (changed.has(String(u.id)) ? { ...u, status } : u));
    selectedItems.value = [];
    showSuccessToast((status === 'active' ? text.activated : text.deactivated).replace('{count}', String(res.count)));
  });

  return (
    <>
      {/* Component: UsersListPage */}
      <PageHeader title={translateApp(lang, 'users.title')} description={translateApp(lang, 'users.subtitle')}>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onClick$={selectAll}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'common.selectAll')}
          </button>
          <Link
            href={R.ADMIN.USERS_NEW}
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {translateApp(lang, 'users.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        {/* List header + bulk bar */}
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'users.list')}</h2>
          {selectedItems.value.length > 0 && (
            <div class="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
              <span>
                {selectedItems.value.length} {translateApp(lang, 'common.selected')}
              </span>
              <button
                type="button"
                disabled={bulkRunning.value}
                onClick$={() => handleBulkStatus('active')}
                class="rounded bg-green-600 px-2 py-1 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {translateApp(lang, 'users.bulkActivate')}
              </button>
              <button
                type="button"
                disabled={bulkRunning.value}
                onClick$={() => handleBulkStatus('inactive')}
                class={`${BTN_SECONDARY} bg-white dark:bg-gray-800`}
              >
                {translateApp(lang, 'users.bulkDeactivate')}
              </button>
              <button
                type="button"
                disabled={bulkRunning.value}
                onClick$={handleBulkDelete}
                class="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {translateApp(lang, 'common.delete')}
              </button>
              <button type="button" onClick$={selectAll} class={BTN_SECONDARY}>
                {translateApp(lang, 'common.selectAll')}
              </button>
              <button type="button" onClick$={deselectAll} class={BTN_SECONDARY}>
                {translateApp(lang, 'common.cancel')}
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div class="mb-4">
          <input
            type="text"
            value={searchQuery.value}
            onInput$={(e) => (searchQuery.value = (e.target as HTMLInputElement).value)}
            placeholder={translateApp(lang, 'common.search')}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>

        {listLoader.value.error && (
          <p class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {listLoader.value.error}
          </p>
        )}

        {/* Rows */}
        {filteredUsers.value.length === 0 ? (
          <EmptyState title={translateApp(lang, 'users.noUsers')} />
        ) : (
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.value.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <li key={user.id} class="flex items-center justify-between gap-3 py-4">
                  <div class="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={isSelf}
                      aria-label={user.name}
                      checked={selectedItems.value.includes(String(user.id))}
                      onChange$={() => toggleSelect(String(user.id))}
                      class={`${ADMIN_CHECKBOX_CLASS} mt-1 shrink-0 disabled:opacity-40`}
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">{user.name}</h3>
                        <span
                          class={
                            user.status === 'active'
                              ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }
                        >
                          {translateApp(lang, user.status === 'active' ? 'users.statusActive' : 'users.statusInactive')}
                        </span>
                        {isSelf && (
                          <span class="text-xs text-gray-500 dark:text-gray-400">({translateApp(lang, 'users.you')})</span>
                        )}
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                      {user.roles.length > 0 && (
                        <div class="mt-2 flex flex-wrap gap-2">
                          {user.roles.map((role) => (
                            <span
                              key={role.id}
                              class="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div class="shrink-0">
                    {/* Row actions dropdown */}
                    <AdminRowActionsMenu label={`${translateApp(lang, 'common.actions')}: ${user.name}`}>
                      <Link role="menuitem" href={adminUserEditHref(lang, user.id)} class={ADMIN_ROW_ACTION_ITEM_CLASS}>
                        {translateApp(lang, 'common.edit')}
                      </Link>
                      {!isSelf && (
                        <>
                          <div class="my-1 border-t border-gray-100 dark:border-gray-700" role="separator" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick$={() => handleDelete(user)}
                            class={ADMIN_ROW_ACTION_DANGER_CLASS}
                          >
                            {translateApp(lang, 'common.delete')}
                          </button>
                        </>
                      )}
                    </AdminRowActionsMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Users - Dashboard',
  meta: [{ name: 'description', content: 'Manage system users' }],
};
