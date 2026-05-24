import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { formatRelativeTime } from '../../../../lib/utils/formatters';
import { showSuccess, showError } from '../../../../lib/utils/toast';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';

export interface NotificationRow {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export const useNotifications = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const client = getApiClient(cookieHeader);
    const res = await client.get<{ data?: NotificationRow[] }>(API_ENDPOINTS.NOTIFICATIONS.LIST);
    const payload = res.data as { data?: NotificationRow[] } | NotificationRow[] | undefined;
    if (Array.isArray(payload)) {
      return payload;
    }
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return [] as NotificationRow[];
  }
});

export default component$(() => {
  const notificationsLoader = useNotifications();
  const notifications = useSignal(notificationsLoader.value);
  const { lang } = useTranslate();

  const apiMutate = $(async (path: string, method: 'POST' | 'DELETE') => {
    const client = getApiClient(null);
    if (method === 'POST') {
      await client.post(path, {});
    } else {
      await client.delete(path);
    }
  });

  const handleMarkRead = $(async (id: string) => {
    try {
      await apiMutate(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id), 'POST');
      const n = notifications.value.find((x) => x.id === id);
      if (n) {
        n.read = true;
      }
      showSuccess('Notification marked as read');
    } catch {
      showError('Failed to update notification');
    }
  });

  const handleMarkUnread = $(async (id: string) => {
    try {
      await apiMutate(API_ENDPOINTS.NOTIFICATIONS.MARK_UNREAD(id), 'POST');
      const n = notifications.value.find((x) => x.id === id);
      if (n) {
        n.read = false;
      }
      showSuccess('Notification marked as unread');
    } catch {
      showError('Failed to update notification');
    }
  });

  const handleDelete = $(async (id: string) => {
    try {
      await apiMutate(API_ENDPOINTS.NOTIFICATIONS.DELETE(id), 'DELETE');
      notifications.value = notifications.value.filter((n) => n.id !== id);
      showSuccess('Notification deleted');
    } catch {
      showError('Failed to delete notification');
    }
  });

  const getTypeColor = (type: NotificationRow['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <>
      <div>
      <PageHeader
        title={translateApp(lang, 'notifications.title')}
        description={translateApp(lang, 'notifications.subtitle')}
      />

      <div class="space-y-4">
        {notifications.value.length === 0 ? (
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p class="text-gray-600 dark:text-gray-400">No notifications</p>
          </div>
        ) : (
          notifications.value.map((notification) => (
            <div
              key={notification.id}
              class={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
                !notification.read ? 'border-2 border-primary-600 dark:border-primary-500' : ''
              }`}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span
                      class={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(notification.type)}`}
                    >
                      {notification.type}
                    </span>
                    {!notification.read && (
                      <span class="h-2 w-2 rounded-full bg-primary-600"></span>
                    )}
                  </div>
                  <h3 class="mt-2 font-semibold text-gray-900 dark:text-white">
                    {notification.title}
                  </h3>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {notification.message}
                  </p>
                  <p class="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                <div class="ml-4 flex gap-2">
                  {notification.read ? (
                    <button
                      type="button"
                      onClick$={() => handleMarkUnread(notification.id)}
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Mark Unread
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick$={() => handleMarkRead(notification.id)}
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick$={() => handleDelete(notification.id)}
                    class="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Notifications - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'View and manage your notifications',
    },
  ],
};
