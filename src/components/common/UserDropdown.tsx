import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import type { User } from '../../lib/auth/types';
import { getLocalizedRoutes, useAppRoutes } from '../../lib/constants/routes';
import { useTranslate, translateApp } from '../../lib/i18n/useTranslate';
import { getConfig } from '../../lib/config';
import { getApiClient } from '../../lib/api/client';
import { API_ENDPOINTS } from '../../lib/api/endpoints';

interface UserDropdownProps {
  user: User;
}

/**
 * User dropdown menu component
 */
export const UserDropdown = component$<UserDropdownProps>((props) => {
  const isOpen = useSignal(false);
  const { lang } = useTranslate();
  const navigate = useNavigate();
  const R = useAppRoutes();
  
  // Handle logout
  // According to QWIK_AUTH_LOGIN_LOGOUT.md:
  // - Call POST /api/auth/logout (best effort, ignore errors)
  // - Clear state: token, user, isAuthenticated
  // - Clear the cookie (server-side for HttpOnly cookies)
  // - Redirect to login page
  const handleLogout = $(async () => {
    const config = getConfig();
    
    // Clear localStorage client-side first
    // This ensures the session is cleared immediately on the client
    if (typeof window !== 'undefined') {
      localStorage.removeItem(config.auth.cookieName);
    }
    
    // Call backend logout API directly
    // This will clear the server-side session and cookies
    try {
      const apiClient = getApiClient();
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Ignore errors - logout should always succeed on client side
      // Even if API call fails, we'll redirect to logout route
      // This matches the documented behavior: "best effort, ignore errors"
    }
    
    // Navigate to logout route which will:
    // 1. Clear HttpOnly cookies server-side (via route loader)
    // 2. Redirect to login page
    // This ensures server-side cookie clearing happens
    if (typeof window !== 'undefined') {
      // Use window.location to trigger a full page navigation
      // This ensures the logout route loader runs and clears cookies
      window.location.href = getLocalizedRoutes(lang).ADMIN.LOGOUT;
    } else {
      // Server-side fallback
      await navigate(getLocalizedRoutes(lang).ADMIN.LOGOUT);
    }
  });

  return (
    <>
      {/* Component: UserDropdown */}
      <div class="relative">
      <button
        onClick$={() => (isOpen.value = !isOpen.value)}
        class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          {props.user.name.charAt(0).toUpperCase()}
        </div>
        <span class="hidden md:block font-semibold">{props.user.name}</span>
        <span class="text-slate-400 ml-1">▼</span>
      </button>

      {isOpen.value && (
        <>
          <div
            class="fixed inset-0 z-10"
            onClick$={() => (isOpen.value = false)}
          ></div>
          <div class="absolute right-0 z-20 mt-3 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl">
            <div class="border-b border-slate-200 dark:border-slate-700 p-5">
              <p class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {props.user.name}
              </p>
              <p class="text-sm text-slate-500 dark:text-slate-400">{props.user.email}</p>
            </div>
            <div class="p-2">
              <Link
                href={R.PROFILE}
                class="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mb-1"
              >
                {translateApp(lang, 'header.profile')}
              </Link>
              <button
                onClick$={handleLogout}
                class="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {translateApp(lang, 'header.logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
});
