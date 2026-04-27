import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { StatCard } from '../../../components/common/StatCard';
import { auth } from '../../../lib/auth';
import { getConfig } from '../../../lib/config';
import { extractCookieHeader, getApiClient } from '../../../lib/api/client';
import { ServerIcon, DatabaseIcon, QueueIcon } from '../../../components/dashboard/icons';

interface SystemHealthApi {
  app_env: string;
  php_version: string;
  laravel_version: string;
  database: { status: string; connection: string; error: string | null };
  cache: { store: string };
  queue: { connection: string };
}

function canAccessSystemHealth(session: { user: { permissions?: string[]; role: string } } | null): boolean {
  if (!session?.user) {
    return false;
  }
  const perms = session.user.permissions ?? [];
  if (perms.includes('manage system')) {
    return true;
  }
  return session.user.role === 'super_admin';
}

export const useSystemHealth = routeLoader$(async ({ cookie, request, redirect: redirectFn }) => {
  const config = getConfig();
  const session = await auth.getSession(cookie);
  if (!canAccessSystemHealth(session)) {
    throw redirectFn(302, config.routes.admin.home);
  }

  const api = getApiClient(extractCookieHeader(cookie, request) ?? undefined);
  try {
    const res = await api.get<SystemHealthApi>('/v1/system/health');
    if (!res.success || !res.data) {
      return { error: true as const };
    }
    return { error: false as const, data: res.data };
  } catch {
    return { error: true as const };
  }
});

/**
 * System health (Laravel — requires manage system or super_admin)
 */
export default component$(() => {
  const health = useSystemHealth();
  const { t } = useTranslate();

  if (health.value.error || !('data' in health.value) || !health.value.data) {
    return (
      <div>
        <PageHeader title={t('system.title')} description={t('system.subtitle')} />
        <p class="text-sm text-gray-600 dark:text-gray-400">Unable to load system health from the API.</p>
      </div>
    );
  }

  const d = health.value.data;
  const dbOk = d.database.status === 'ok';

  return (
    <>
      {/* Component: SystemPage */}
      <div>
        <PageHeader title={t('system.title')} description={t('system.subtitle')} />

        <div class="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Environment" value={d.app_env} icon={ServerIcon} />
          <StatCard title="PHP" value={d.php_version} icon={ServerIcon} />
          <StatCard
            title="Database"
            value={dbOk ? d.database.connection : 'error'}
            icon={DatabaseIcon}
          />
          <StatCard title="Queue" value={d.queue.connection} icon={QueueIcon} />
        </div>

        <div class="mb-8 grid gap-6 md:grid-cols-2">
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Laravel</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">{d.laravel_version}</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Cache store</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">{d.cache.store}</p>
          </div>
        </div>

        {d.database.error && (
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Database check: {d.database.error}
          </div>
        )}

        <p class="mt-8 text-xs text-gray-500 dark:text-gray-500">Data from GET /api/v1/system/health</p>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'System Health - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Monitor system health and performance',
    },
  ],
};
