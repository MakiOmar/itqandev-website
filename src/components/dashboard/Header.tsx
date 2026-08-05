import { component$, type QRL, useContext } from '@builder.io/qwik';
import { UserDropdown } from '../common/UserDropdown';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useAppRoutes } from '../../lib/constants/routes';
import { AdminSessionContext } from '../../stores/admin-session-context';
import { MenuIcon } from './icons';
import { useTranslate, translateApp } from '../../lib/i18n/useTranslate';

interface HeaderProps {
  onMenuClick?: QRL<() => void>;
}

/**
 * Dashboard header: menu toggle, view-site link, language + user controls.
 * Brand logo/name live in the sidebar.
 */
export const Header = component$<HeaderProps>((props) => {
  const auth = useContext(AdminSessionContext);
  const { lang } = useTranslate();
  const R = useAppRoutes();

  return (
    <>
      {/* Component: Header */}
      <header class="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-colors duration-300">
      <div class="flex h-16 md:h-20 lg:h-24 items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12">
        <div class="flex items-center gap-3 md:gap-5">
          {props.onMenuClick && (
            <button
              onClick$={props.onMenuClick}
              class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={translateApp(lang, 'sidebar.toggleSidebar')}
            >
              <MenuIcon />
            </button>
          )}
          {/* Opens the public marketing site in a new tab */}
          <a
            href={R.PUBLIC.HOME}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:bg-slate-800 dark:hover:text-primary-300"
          >
            <svg
              class="h-4 w-4 shrink-0 opacity-80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            {translateApp(lang, 'common.viewSite')}
          </a>
        </div>
        <div class="flex items-center gap-3 md:gap-4">
          <LanguageSwitcher />
          {auth.value?.user && <UserDropdown user={auth.value.user} />}
        </div>
      </div>
    </header>
    </>
  );
});
