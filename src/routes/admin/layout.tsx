import { component$, Slot, useSignal, $, useStore, useContextProvider, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { Header } from '../../components/dashboard/Header';
import { auth } from '../../lib/auth';
import { getConfig } from '../../lib/config';
import { defaultProjectSettings, getProjectSettings, type ProjectSettings } from '../../lib/api/project-settings';
import { getApiClient } from '../../lib/api/client';
import { ProjectSettingsContext } from '../../stores/project-settings-store';

/**
 * Admin dashboard auth loader - ensures user is authenticated
 * Redirects to login if not authenticated (except on login page)
 * NOTE: This loader runs on all admin routes including login page
 */
export const useAdminAuth = routeLoader$(async ({ cookie, url, redirect: redirectFn }) => {
  const config = getConfig();
  const pathname = url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  // Check for login page with or without trailing slash
  const isLoginPage = normalizedPath === config.routes.admin.login || normalizedPath === '/admin/login' || pathname === '/admin/login/';
  
  // For login page, check if user is authenticated
  // If localStorage was cleared but cookie still exists, allow access to login page
  // The cookie will be cleared on next API call or expire naturally
  try {
    const session = await auth.getSession(cookie);
    
    // If on login page and already authenticated, redirect to admin home
    // BUT: If we just logged out (localStorage cleared), allow access to login page
    // The session cookie might still exist but will be invalid on next API call
    if (isLoginPage && session) {
      throw redirectFn(302, config.routes.admin.home);
    }
    
    // If not on login page and not authenticated, redirect to login
    if (!isLoginPage && !session) {
      throw redirectFn(302, config.routes.admin.login);
    }
    
    // Return session if authenticated, null if not
    return session;
  } catch (error: any) {
    // Re-throw redirects
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
    // If getSession fails (e.g., API error), return null for login page, redirect otherwise
    if (!isLoginPage) {
      throw redirectFn(302, config.routes.admin.login);
    }
    return null;
  }
});

/**
 * ARCHITECTURE: Client-side settings loading
 * 
 * Project settings are loaded client-side to reduce server-side rendering overhead.
 * Only authentication is checked server-side for security.
 * 
 * Settings are cached client-side using getProjectSettings() which has built-in caching.
 */

/**
 * Admin dashboard layout with sidebar and header
 * Shows only login form if user is not authenticated
 */
export default component$(() => {
  const location = useLocation();
  const config = getConfig();
  const pathname = location.url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isLoginPage = normalizedPath === config.routes.admin.login || normalizedPath === '/admin/login';
  const locale = useSpeakLocale();
  
  // Check direction directly from document attribute (set immediately by blocking script)
  // This ensures sidebar position changes simultaneously with direction, preventing flash
  // Initialize from locale for SSR, then sync with document attribute on client
  const isRTL = useSignal(locale.lang === 'ar');
  
  // Track direction from document attribute and update immediately
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateDirection = () => {
      if (typeof document !== 'undefined') {
        const dir = document.documentElement.getAttribute('dir');
        // Update immediately - this will trigger re-render with correct margin
        if (isRTL.value !== (dir === 'rtl')) {
          isRTL.value = dir === 'rtl';
        }
      }
    };
    
    // Set initial value immediately (in case it changed between render and this task)
    updateDirection();
    
    // Watch for changes to dir attribute - update immediately when it changes
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateDirection);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
      });
      
      cleanup(() => observer.disconnect());
    }
  });
  
  // Check authentication status (redirects are handled in routeLoader$)
  // This is the ONLY server-side operation - security critical
  const adminAuth = useAdminAuth();
  
  // CLIENT-SIDE: Load project settings (logo, branding, etc.)
  // Settings are cached client-side to avoid repeated API calls
  const settingsStore = useStore<{
    settings: ProjectSettings;
    isLoading: boolean;
    error: string | null;
  }>({
    settings: defaultProjectSettings,
    isLoading: true,
    error: null,
  });
  
  // Load settings client-side when component becomes visible
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (isLoginPage) {
      settingsStore.isLoading = false;
      return;
    }
    
    try {
      // getProjectSettings() has built-in client-side caching
      const settings = await getProjectSettings();
      settingsStore.settings = settings;
      settingsStore.error = null;
    } catch (error: any) {
      console.warn('Failed to load project settings:', error);
      settingsStore.settings = defaultProjectSettings;
      settingsStore.error = error?.message || 'Failed to load settings';
    } finally {
      settingsStore.isLoading = false;
    }
  });
  
  // Provide project settings context to child components
  useContextProvider(ProjectSettingsContext, settingsStore);
  
  // Monitor authentication state and sync session to localStorage on client-side
  // Also check if session was removed (logout) and redirect if needed
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    if (isLoginPage) {
      return;
    }
    
    const config = getConfig();
    const sessionKey = config.auth.cookieName;
    
    // Track adminAuth to react to changes
    track(() => adminAuth.value);
    
    // Check if user is logged out (no session in localStorage and no server session)
    if (!adminAuth.value) {
      // No server session - check localStorage
      if (typeof window !== 'undefined') {
        const localSession = localStorage.getItem(sessionKey);
        if (!localSession) {
          // Both server and client sessions are gone - redirect to login
          // Remove trailing slash to avoid 404
          const loginRoute = config.routes.admin.login.replace(/\/+$/, '');
          window.location.replace(loginRoute);
          return;
        }
      }
      // Server session is null but localStorage might have stale data
      // The routeLoader should have already redirected, but if we're here, force redirect
      if (typeof window !== 'undefined') {
        // Remove trailing slash to avoid 404
        const loginRoute = config.routes.admin.login.replace(/\/+$/, '');
        window.location.replace(loginRoute);
      }
      return;
    }
    
    // User is authenticated - sync to localStorage
    // Check if localStorage already has the session
    const existingSession = typeof window !== 'undefined' 
      ? localStorage.getItem(sessionKey) 
      : null;
    
    if (!existingSession && adminAuth.value) {
      // Session exists server-side but not in localStorage
      // Store it in localStorage for client-side API calls
      
      // Use the session from routeLoader directly
      // If it doesn't have a token, we need to fetch it from the API
      if (adminAuth.value.token && adminAuth.value.token !== 'sanctum_cookie' && typeof window !== 'undefined') {
        // Session has a valid token, store it directly
        localStorage.setItem(sessionKey, JSON.stringify(adminAuth.value));
      } else {
        // Session doesn't have a token, fetch it from API using cookies
        // For client-side, we need to use the API client which will use cookies
        try {
          const apiClient = getApiClient();
          const response = await apiClient.get('/me');
          if (response.success && response.data && typeof window !== 'undefined') {
            const userData = response.data as any;
            const session = {
              user: userData,
              token: userData?.token || 'sanctum_cookie',
              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };
            localStorage.setItem(sessionKey, JSON.stringify(session));
          }
        } catch {
          // If API call fails, still try to store what we have
          if (adminAuth.value && typeof window !== 'undefined') {
            localStorage.setItem(sessionKey, JSON.stringify(adminAuth.value));
          }
        }
      }
    }
    
    // Monitor localStorage for session removal (logout from another tab/window)
    // If session is removed from localStorage, redirect to login
    if (typeof window !== 'undefined') {
      // Set up storage event listener to detect logout from other tabs
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === sessionKey && !e.newValue && !isLoginPage) {
          // Remove trailing slash to avoid 404
          const loginRoute = config.routes.admin.login.replace(/\/+$/, '');
          window.location.replace(loginRoute);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Cleanup listener on component unmount
      cleanup(() => {
        window.removeEventListener('storage', handleStorageChange);
      });
    }
  });
  
  // For login page, always render the route component (Slot) to allow the login route to handle itself
  if (isLoginPage) {
    return <Slot />;
  }
  //
  // If we reach here, user should be authenticated (redirects handled in loader)
  // But add an extra check to prevent rendering dashboard with empty data
  if (!adminAuth.value) {
    // Session is null - redirect should have happened, but if we're here, show nothing
    // The useVisibleTask$ will handle the redirect
    return null;
  }
  
  // Sidebar starts open by default
  const isSidebarOpen = useSignal(true);

  const toggleSidebar = $(() => {
    isSidebarOpen.value = !isSidebarOpen.value;
  });

  const closeSidebar = $(() => {
    isSidebarOpen.value = false;
  });

  return (
    <>
      {adminAuth.value && !isLoginPage && (
        <script
          dangerouslySetInnerHTML={`
            (function(){try{
              var key=${JSON.stringify(config.auth.cookieName)};
              var session=${JSON.stringify(adminAuth.value).replace(/</g, '\\u003c')};
              localStorage.setItem(key, JSON.stringify(session));
            }catch(e){}})();
          `}
        />
      )}
      {/* Component: AdminDashboardLayout */}
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300">
        <Sidebar isOpen={isSidebarOpen.value} onClose={closeSidebar} />
        <div class={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen.value 
            ? (isRTL.value ? 'lg:mr-72' : 'lg:ml-72')
            : (isRTL.value ? 'lg:mr-0' : 'lg:ml-0')
        }`}>
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
