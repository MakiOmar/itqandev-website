import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { auth } from '../../../../../lib/auth';
import { getLocalizedRoutes, routesFromPreferredCookie } from '../../../../../lib/constants/routes';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import {
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_BACK_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';
import {
  createDatabaseBackupFromBrowser,
  deleteDatabaseBackupFromBrowser,
  downloadDatabaseBackupFromBrowser,
  fetchDatabaseBackupsFromBrowser,
  formatBackupBytes,
  restoreDatabaseBackupFromBrowser,
  type DatabaseBackupItem,
} from '../../../../../lib/admin/database-backup-actions';

function canAccessSystemBackups(session: { user: { permissions?: string[]; role: string } } | null): boolean {
  if (!session?.user) {
    return false;
  }
  const perms = session.user.permissions ?? [];
  if (perms.includes('manage system')) {
    return true;
  }
  return session.user.role === 'super_admin' || session.user.role === 'admin';
}

export const useBackupAccess = routeLoader$(async ({ cookie, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  const session = await auth.getSession(cookie);
  if (!canAccessSystemBackups(session)) {
    throw redirectFn(302, R.ADMIN.HOME);
  }
  return { ok: true as const };
});

/**
 * Admin: create / download / delete SQL database backups and restore with typed confirmation.
 */
export default component$(() => {
  useBackupAccess();
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { confirm, success, error: showError } = useSwal();

  const loading = useSignal(true);
  const busy = useSignal(false);
  const items = useSignal<DatabaseBackupItem[]>([]);
  const confirmPhrase = useSignal('CONFIRM');
  const driver = useSignal('');
  const maxFiles = useSignal(20);

  const reload$ = $(async () => {
    const res = await fetchDatabaseBackupsFromBrowser();
    items.value = res.data ?? [];
    confirmPhrase.value = res.meta?.confirm_phrase || 'CONFIRM';
    driver.value = res.meta?.driver || '';
    maxFiles.value = res.meta?.max_files ?? 20;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      await reload$();
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupLoadFailed'),
      });
    } finally {
      loading.value = false;
    }
  });

  const onCreate$ = $(async () => {
    busy.value = true;
    try {
      await createDatabaseBackupFromBrowser();
      await reload$();
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'system.backupCreated'),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupCreateFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  const onDownload$ = $(async (filename: string) => {
    busy.value = true;
    try {
      await downloadDatabaseBackupFromBrowser(filename);
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupDownloadFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  const onDelete$ = $(async (filename: string) => {
    const result = await confirm(translateApp(lang, 'system.backupDeleteConfirm', { filename }), {
      title: translateApp(lang, 'common.confirm'),
      icon: 'warning',
    });
    if (!result.isConfirmed) {
      return;
    }
    busy.value = true;
    try {
      await deleteDatabaseBackupFromBrowser(filename);
      await reload$();
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'system.backupDeleted'),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupDeleteFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  const promptRestoreConfirmation$ = $(async (): Promise<string | null> => {
    const phrase = confirmPhrase.value || 'CONFIRM';
    const result = await confirm(translateApp(lang, 'system.backupRestoreConfirmText', { phrase }), {
      title: translateApp(lang, 'system.backupRestoreTitle'),
      icon: 'warning',
      confirmText: translateApp(lang, 'system.backupRestore'),
      input: 'text',
      inputPlaceholder: phrase,
      inputValidator: (value: string) => {
        if (String(value || '') !== phrase) {
          return translateApp(lang, 'system.backupRestoreMismatch', { phrase });
        }
        return null;
      },
    });
    if (!result.isConfirmed) {
      return null;
    }
    return String(result.value || '');
  });

  const onRestoreStored$ = $(async (filename: string) => {
    const confirmation = await promptRestoreConfirmation$();
    if (confirmation === null) {
      return;
    }
    busy.value = true;
    try {
      await restoreDatabaseBackupFromBrowser({ confirmation, filename });
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'system.backupRestored'),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupRestoreFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  const onRestoreUpload$ = $(async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const confirmation = await promptRestoreConfirmation$();
    if (confirmation === null) {
      return;
    }

    busy.value = true;
    try {
      await restoreDatabaseBackupFromBrowser({ confirmation, file });
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'system.backupRestored'),
      });
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), {
        text: e instanceof Error ? e.message : translateApp(lang, 'system.backupRestoreFailed'),
      });
    } finally {
      busy.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <PageHeader
        title={translateApp(lang, 'system.backupTitle')}
        description={translateApp(lang, 'system.backupSubtitle')}
      />

      <div class="flex flex-wrap items-center gap-3">
        <Link href={R.ADMIN.SYSTEM} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'system.backupBackToHealth')}
        </Link>
        <button
          type="button"
          class={ADMIN_PRIMARY_BUTTON_CLASS}
          disabled={busy.value || loading.value}
          onClick$={onCreate$}
        >
          {busy.value
            ? translateApp(lang, 'common.loading')
            : translateApp(lang, 'system.backupCreate')}
        </button>
      </div>

      <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{translateApp(lang, 'system.backupWarning')}</p>
        {driver.value ? (
          <p class="mt-1 text-xs opacity-80">
            {translateApp(lang, 'system.backupDriver', { driver: driver.value })}
            {' · '}
            {translateApp(lang, 'system.backupRetention', { count: String(maxFiles.value) })}
          </p>
        ) : null}
      </div>

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {translateApp(lang, 'system.backupListTitle')}
        </h2>
        {loading.value ? (
          <p class="mt-3 text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
        ) : items.value.length === 0 ? (
          <p class="mt-3 text-sm text-gray-500">{translateApp(lang, 'system.backupEmpty')}</p>
        ) : (
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-start text-sm">
              <thead>
                <tr class="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  <th class="px-2 py-2 font-medium">{translateApp(lang, 'system.backupFilename')}</th>
                  <th class="px-2 py-2 font-medium">{translateApp(lang, 'system.backupSize')}</th>
                  <th class="px-2 py-2 font-medium">{translateApp(lang, 'system.backupCreatedAt')}</th>
                  <th class="px-2 py-2 font-medium">{translateApp(lang, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.value.map((item) => (
                  <tr
                    key={item.filename}
                    class="border-b border-gray-100 dark:border-gray-700/60"
                  >
                    <td class="px-2 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                      {item.filename}
                    </td>
                    <td class="px-2 py-2 text-gray-700 dark:text-gray-300">
                      {formatBackupBytes(item.size)}
                    </td>
                    <td class="px-2 py-2 text-gray-700 dark:text-gray-300">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td class="px-2 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          class="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                          disabled={busy.value}
                          onClick$={() => onDownload$(item.filename)}
                        >
                          {translateApp(lang, 'system.backupDownload')}
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/40"
                          disabled={busy.value}
                          onClick$={() => onRestoreStored$(item.filename)}
                        >
                          {translateApp(lang, 'system.backupRestore')}
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          disabled={busy.value}
                          onClick$={() => onDelete$(item.filename)}
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
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {translateApp(lang, 'system.backupUploadTitle')}
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {translateApp(lang, 'system.backupUploadHelp', {
            phrase: confirmPhrase.value || 'CONFIRM',
          })}
        </p>
        <div class="mt-4 max-w-md space-y-3">
          <div>
            <label class={ADMIN_FORM_LABEL_CLASS} for="backup-file-input">
              {translateApp(lang, 'system.backupChooseFile')}
            </label>
            <input
              id="backup-file-input"
              type="file"
              accept=".sql,application/sql,text/plain"
              class="block w-full text-sm text-gray-700 dark:text-gray-200"
              disabled={busy.value}
              onChange$={onRestoreUpload$}
            />
          </div>
        </div>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Database Backup - Dashboard',
  meta: [{ name: 'description', content: 'Create and restore database SQL backups' }],
};
