import { component$, Slot, useSignal, $, useStore, useContext, useContextProvider, useVisibleTask$ } from '@builder.io/qwik';
import { useSpeakLocale } from 'qwik-speak';
import { isUiLocaleRtl } from '../../lib/i18n/ui-locale-segments';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { getConfig } from '../../lib/config';
import { defaultProjectSettings, type ProjectSettings } from '../../lib/api/project-settings';
import { getApiClient } from '../../lib/api/client';
import { ProjectSettingsContext } from '../../stores/project-settings-store';
import { getLocalizedRoutes } from '../../lib/constants/routes';
import { AdminSessionContext } from '../../stores/admin-session-context';

/**
 * Dashboard chrome (sidebar, header, settings, auth sync).
 * Kept separate from admin layout so /admin/login does not load useVisibleTask QRL chunks.
 */
export const AuthenticatedAdminLayout = component$((props: { settings?: ProjectSettings }) => {
  const config = getConfig();
  const locale = useSpeakLocale();
  const localized = getLocalizedRoutes(locale.lang);
  const loginHrefClient = localized.ADMIN.LOGIN.replace(/\/+$/, '');
  const adminAuth = useContext(AdminSessionContext);

  const isRTL = useSignal(isUiLocaleRtl(locale.lang));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateDirection = () => {
      if (typeof document !== 'undefined') {
        const dir = document.documentElement.getAttribute('dir');
        if (isRTL.value !== (dir === 'rtl')) {
          isRTL.value = dir === 'rtl';
        }
      }
    };

    updateDirection();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateDirection);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
      });

      cleanup(() => observer.disconnect());
    }
  });

  const settingsStore = useStore<{
    settings: ProjectSettings;
    isLoading: boolean;
    error: string | null;
  }>({
    settings: props.settings ?? defaultProjectSettings,
    isLoading: false,
    error: null,
  });

  useContextProvider(ProjectSettingsContext, settingsStore);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    const sessionKey = config.auth.cookieName;

    track(() => adminAuth.value);

    if (!adminAuth.value) {
      if (typeof window !== 'undefined') {
        const localSession = localStorage.getItem(sessionKey);
        if (!localSession) {
          window.location.replace(loginHrefClient);
          return;
        }
        window.location.replace(loginHrefClient);
      }
      return;
    }

    const existingSession =
      typeof window !== 'undefined' ? localStorage.getItem(sessionKey) : null;

    if (!existingSession && adminAuth.value) {
      if (
        adminAuth.value.token &&
        adminAuth.value.token !== 'sanctum_cookie' &&
        typeof window !== 'undefined'
      ) {
        localStorage.setItem(sessionKey, JSON.stringify(adminAuth.value));
      } else {
        try {
          const apiClient = getApiClient();
          const response = await apiClient.get('/me');
          if (response.success && response.data && typeof window !== 'undefined') {
            const userData = response.data as { token?: string };
            const session = {
              user: userData,
              token: userData?.token || 'sanctum_cookie',
              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };
            localStorage.setItem(sessionKey, JSON.stringify(session));
          }
        } catch {
          if (adminAuth.value && typeof window !== 'undefined') {
            localStorage.setItem(sessionKey, JSON.stringify(adminAuth.value));
          }
        }
      }
    }

    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === sessionKey && !e.newValue) {
          window.location.replace(loginHrefClient);
        }
      };

      window.addEventListener('storage', handleStorageChange);
      cleanup(() => window.removeEventListener('storage', handleStorageChange));
    }
  });

  const isSidebarOpen = useSignal(true);

  const toggleSidebar = $(() => {
    isSidebarOpen.value = !isSidebarOpen.value;
  });

  const closeSidebar = $(() => {
    isSidebarOpen.value = false;
  });

  if (!adminAuth.value) {
    return null;
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={`
          (function(){try{
            var key=${JSON.stringify(config.auth.cookieName)};
            var session=${JSON.stringify(adminAuth.value).replace(/</g, '\\u003c')};
            localStorage.setItem(key, JSON.stringify(session));
          }catch(e){}})();
        `}
      />
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300">
        <Sidebar isOpen={isSidebarOpen.value} onClose={closeSidebar} />
        <div
          class={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            isSidebarOpen.value
              ? isRTL.value
                ? 'lg:mr-72'
                : 'lg:ml-72'
              : isRTL.value
                ? 'lg:mr-0'
                : 'lg:ml-0'
          }`}
        >
          <Header onMenuClick={toggleSidebar} />
          <main class="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12">
            <div class="max-w-7xl mx-auto">
              <Slot />
            </div>
          </main>
        </div>
      </div>
    </>
  );
});
