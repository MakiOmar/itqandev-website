import { component$ } from '@builder.io/qwik';
import type { DocumentHead, RequestEvent  } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { StatCard } from '../../../components/common/StatCard';
import { formatFileSize } from '../../../lib/utils/formatters';
import { mockAuth } from '../../../lib/auth/mock-auth';
import {
  ServerIcon,
  DatabaseIcon,
  QueueIcon,
  LinkIcon,
} from '../../../components/dashboard/icons';
import { ROUTES } from '../../../lib/constants/routes'; // adjust path if needed

/**
 * System health interface
 */
interface SystemHealth {
  serverStatus: string;
  databaseStatus: string;
  queueStatus: string;
  storageUsed: number;
  storageTotal: number;
  cacheHitRate: number;
  activeConnections: number;
  failedJobs: number;
}
// ✅ Guard runs before loader + rendering
export const onRequest = ({ cookie, redirect }: RequestEvent) => {
  const session = mockAuth.getSession(cookie);

  if (!session || session.user.role !== 'super_admin') {
    throw redirect(302, ROUTES.ADMIN.HOME);
  }
};

/**
 * System health route loader
 */
export const useSystemHealth = routeLoader$(async () => {
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Mock system health data
    return {
    serverStatus: 'healthy',
    databaseStatus: 'connected',
    queueStatus: 'running',
    storageUsed: 45.2 * 1024 * 1024 * 1024, // 45.2 GB
    storageTotal: 100 * 1024 * 1024 * 1024, // 100 GB
    cacheHitRate: 92.5,
    activeConnections: 234,
    failedJobs: 3,
  } as SystemHealth;
});

/**
 * System health page (Super Admin only)
 */
export default component$(() => {
  const systemStats = useSystemHealth();
  const { t } = useTranslate();
  const storagePercentage = (systemStats.value.storageUsed / systemStats.value.storageTotal) * 100;

  return (
    <>
      {/* Component: SystemPage */}
      <div>
      <PageHeader
        title={t('system.title')}
        description={t('system.subtitle')}
      />

      {/* System Status Cards */}
      <div class="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Server Status"
          value={systemStats.value.serverStatus}
          icon={ServerIcon}
        />
        <StatCard
          title="Database Status"
          value={systemStats.value.databaseStatus}
          icon={DatabaseIcon}
        />
        <StatCard
          title="Queue Status"
          value={systemStats.value.queueStatus}
          icon={QueueIcon}
        />
        <StatCard
          title="Active Connections"
          value={systemStats.value.activeConnections.toString()}
          icon={LinkIcon}
        />
      </div>

      {/* Storage Usage */}
      <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Storage Usage
        </h2>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Used</span>
            <span class="font-medium text-gray-900 dark:text-white">
              {formatFileSize(systemStats.value.storageUsed)} /{' '}
              {formatFileSize(systemStats.value.storageTotal)}
            </span>
          </div>
          <div class="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full bg-primary-600 transition-all"
              style={`width: ${storagePercentage}%`}
            ></div>
          </div>
          <div class="text-right text-xs text-gray-600 dark:text-gray-400">
            {storagePercentage.toFixed(1)}% used
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Cache Statistics
        </h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats.value.cacheHitRate}%
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Failed Jobs</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats.value.failedJobs}
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled Tasks */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Scheduled Tasks
        </h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Database Backup</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Runs daily at 2:00 AM</p>
            </div>
            <span class="rounded-full bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400 px-3 py-1 text-xs font-medium">
              Active
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Cache Cleanup</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Runs every 6 hours</p>
            </div>
            <span class="rounded-full bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400 px-3 py-1 text-xs font-medium">
              Active
            </span>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Log Rotation</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Runs weekly on Sunday</p>
            </div>
            <span class="rounded-full bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400 px-3 py-1 text-xs font-medium">
              Active
            </span>
          </div>
        </div>
      </div>
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
