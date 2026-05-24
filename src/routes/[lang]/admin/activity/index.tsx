import { component$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { DataTable, type Column } from '../../../../components/common/DataTable';
import { auth } from '../../../../lib/auth';
import { routesFromPreferredCookie } from '../../../../lib/constants/routes';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';

export interface ActivityLogRow {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  createdAt: string;
}

interface ActivityLoaderData {
  logs: ActivityLogRow[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export const useActivityLogs = routeLoader$(async ({ cookie, request, redirect: redirectFn, query }) => {
  const R = routesFromPreferredCookie(cookie);
  const session = await auth.getSession(cookie);
  const allowed =
    session &&
    (session.user.role === 'admin' ||
      session.user.role === 'super_admin' ||
      (session.user.permissions ?? []).includes('view activity') ||
      (session.user.permissions ?? []).includes('manage system'));
  if (!allowed) {
    throw redirectFn(302, R.ADMIN.HOME);
  }

  const page = Math.max(1, Number(query.get('page') || '1'));
  const perPage = Math.min(100, Math.max(1, Number(query.get('per_page') || '20')));
  const search = query.get('search')?.trim() ?? '';

  const empty: ActivityLoaderData = {
    logs: [],
    pagination: { currentPage: page, perPage, total: 0, totalPages: 0 },
  };

  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const client = getApiClient(cookieHeader);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    if (search) {
      params.set('search', search);
    }
    const res = await client.get<{
      data?: ActivityLogRow[];
      current_page?: number;
      per_page?: number;
      total?: number;
      last_page?: number;
    }>(`${API_ENDPOINTS.ACTIVITY.LIST}?${params.toString()}`);

    const payload = res.data as {
      data?: ActivityLogRow[];
      current_page?: number;
      per_page?: number;
      total?: number;
      last_page?: number;
    };

    const logs = Array.isArray(payload?.data) ? payload.data : [];
    return {
      logs,
      pagination: {
        currentPage: payload?.current_page ?? page,
        perPage: payload?.per_page ?? perPage,
        total: payload?.total ?? logs.length,
        totalPages: payload?.last_page ?? 1,
      },
    };
  } catch {
    return empty;
  }
});

export default component$(() => {
  const activityData = useActivityLogs();
  const { lang } = useTranslate();

  const columns: Column<ActivityLogRow>[] = [
    { key: 'userName', label: 'User', sortable: true },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'resource', label: 'Resource', sortable: true },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'createdAt', label: 'Date', sortable: true },
  ];

  const handleExport = $(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const base = import.meta.env?.VITE_API_BASE_URL || '/api';
    const token = (() => {
      try {
        const session = localStorage.getItem('auth_session');
        if (!session) {
          return null;
        }
        return JSON.parse(session).token as string | null;
      } catch {
        return null;
      }
    })();
    const url = `${String(base).replace(/\/$/, '')}${API_ENDPOINTS.ACTIVITY.EXPORT}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `activity-logs-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => undefined);
  });

  return (
    <>
      <div>
        <PageHeader
          title={translateApp(lang, 'activity.title')}
          description={translateApp(lang, 'activity.subtitle')}
        />

        <div class="mb-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick$={handleExport}
          >
            Export CSV
          </button>
        </div>

        <DataTable
          columns={columns}
          data={activityData.value.logs}
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
