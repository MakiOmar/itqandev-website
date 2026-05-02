import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { mockNotifications, type Notification } from '../../../../lib/api/mock-data';
import { formatRelativeTime } from '../../../../lib/utils/formatters';
import { showSuccess } from '../../../../lib/utils/toast';

/**
 * Load notifications
 */
export const useNotifications = routeLoader$(async () => {
  try {
    // TODO: Replace with real API call
    // const apiClient = getApiClient();
    // const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
    // return response?.data ?? [];
    
    // For now, return mock data
    return mockNotifications;
  } catch (error: any) {
    console.error('Failed to load notifications:', error);
    return [];
  }
});

/**
 * Notifications page
 */
export default component$(() => {
  const notificationsLoader = useNotifications();
  const notifications = useSignal(notificationsLoader.value);
  const { lang } = useTranslate();

  const handleMarkRead = $((id: string) => {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
      showSuccess('Notification marked as read');
    }
  });

  const handleMarkUnread = $((id: string) => {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification) {
      notification.read = false;
      showSuccess('Notification marked as unread');
    }
  });

  const handleDelete = $((id: string) => {
    notifications.value = notifications.value.filter((n) => n.id !== id);
    showSuccess('Notification deleted');
  });

  const getTypeColor = (type: Notification['type']) => {
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
      {/* Component: NotificationsPage */}
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
                      onClick$={() => handleMarkUnread(notification.id)}
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Mark Unread
                    </button>
                  ) : (
                    <button
                      onClick$={() => handleMarkRead(notification.id)}
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
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
