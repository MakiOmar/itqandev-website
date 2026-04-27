import { component$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { auth } from '../../../lib/auth';
import { getConfig } from '../../../lib/config';
import type { ActivityLog } from '../../../lib/api/mock-data';

/**
 * Activity logs — UI shell only; audit trail API is not wired yet.
 */
export const useActivityLogs = routeLoader$(async ({ cookie, redirect: redirectFn }) => {
  const config = getConfig();
  const session = await auth.getSession(cookie);
  const allowed =
    session &&
    (session.user.role === 'admin' || session.user.role === 'super_admin');
  if (!allowed) {
    throw redirectFn(302, config.routes.admin.home);
  }

  return {
    logs: [] as unknown as ActivityLog[],
    pagination: {
      currentPage: 1,
      perPage: 10,
      total: 0,
      totalPages: 0,
    },
  };
});

/**
 * Activity logs page (admin / super_admin only; list empty until backend exists)
 */
export default component$(() => {
  const activityData = useActivityLogs();
  const { t } = useTranslate();

  const columns: Column<ActivityLog>[] = [
    { key: 'userName', label: 'User', sortable: true },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'resource', label: 'Resource', sortable: true },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'createdAt', label: 'Date', sortable: true },
  ];

  return (
    <>
      {/* Component: ActivityPage */}
      <div>
        <PageHeader
          title={t('activity.title')}
          description={t('activity.subtitle')}
        />

        <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Activity history will appear here when an audit API is connected.
        </p>

        <DataTable
          columns={columns}
          data={activityData.value.logs}
          search={{
            value: '',
            onSearch: $(() => {}),
            placeholder: 'Search activity logs...',
          }}
          pagination={{
            currentPage: activityData.value.pagination.currentPage,
            perPage: activityData.value.pagination.perPage,
            total: activityData.value.pagination.total,
            onPageChange: $(() => {}),
            onPerPageChange: $(() => {}),
          }}
          emptyMessage="No activity logs yet"
        />
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Activity Logs - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'View system activity logs',
    },
  ],
};
