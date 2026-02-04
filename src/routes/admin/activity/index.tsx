import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { mockActivityLogs, type ActivityLog } from '../../../lib/api/mock-data';
import { formatDate, formatRelativeTime } from '../../../lib/utils/formatters';
import { mockAuth } from '../../../lib/auth/mock-auth';

/**
 * Activity logs route loader with pagination and search
 */
export const useActivityLogs = routeLoader$(async ({ url, cookie }) => {
  try {
    // Check auth
    const session = mockAuth.getSession(cookie);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      throw new Error('Unauthorized');
    }

    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '10', 10);
    const search = url.searchParams.get('search') || '';

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Filter logs
    let filtered = [...mockActivityLogs];
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query),
      );
    }

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginated = filtered.slice(start, end);

    // Format data
    const processed = paginated.map((log) => ({
      ...log,
      createdAt: `${formatDate(log.createdAt)} (${formatRelativeTime(log.createdAt)})`,
    }));

    return {
      logs: processed,
      pagination: {
        currentPage: page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load activity logs');
  }
});

/**
 * Activity logs page (Admin only)
 */
export default component$(() => {
  const activityData = useActivityLogs();
  const navigate = useNavigate();
  const searchQuery = useSignal('');
  const { t } = useTranslate();

  // Convert all callbacks to QRLs
  const handleSearch = $((value: string) => {
    searchQuery.value = value;
    const url = new URL(window.location.href);
    url.searchParams.set('search', value);
    url.searchParams.set('page', '1');
    navigate(url.pathname + url.search);
  });

  const handlePageChange = $((page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    navigate(url.pathname + url.search);
  });

  const handlePerPageChange = $((newPerPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('perPage', newPerPage.toString());
    url.searchParams.set('page', '1');
    navigate(url.pathname + url.search);
  });

  // Columns definition - no render functions needed as data is pre-processed
  const columns: Column<ActivityLog>[] = [
    {
      key: 'userName',
      label: 'User',
      sortable: true,
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
    },
    {
      key: 'resource',
      label: 'Resource',
      sortable: true,
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
    },
  ];

  return (
    <>
      {/* Component: ActivityPage */}
      <div>
      <PageHeader
        title={t('activity.title')}
        description={t('activity.subtitle')}
      />

      <DataTable
        columns={columns}
        data={activityData.value.logs}
        search={{
          value: searchQuery.value,
          onSearch: handleSearch,
          placeholder: 'Search activity logs...',
        }}
        pagination={{
          currentPage: activityData.value.pagination.currentPage,
          perPage: activityData.value.pagination.perPage,
          total: activityData.value.pagination.total,
          onPageChange: handlePageChange,
          onPerPageChange: handlePerPageChange,
        }}
        emptyMessage="No activity logs found"
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
