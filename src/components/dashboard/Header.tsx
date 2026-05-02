import { component$, type QRL, useContext, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { UserDropdown } from '../common/UserDropdown';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useAppRoutes } from '../../lib/constants/routes';
import { useAdminAuth } from '../../routes/[lang]/admin/layout';
import { MenuIcon } from './icons';
import { ProjectSettingsContext } from '../../stores/project-settings-store';

interface HeaderProps {
  onMenuClick?: QRL<() => void>;
}

/**
 * Dashboard header component with menu toggle
 * Uses project settings (logo, name) from Laravel API
 */
export const Header = component$<HeaderProps>((props) => {
  const auth = useAdminAuth();
  const R = useAppRoutes();
  const projectSettings = useContext(ProjectSettingsContext);
  const isDarkMode = useSignal(false);
  
  // Get project name and logo from Laravel settings
  const projectName = projectSettings.settings?.name || 'Dashboard';
  const defaultLogo = projectSettings.settings?.logo;
  const projectLightLogo = projectSettings.settings?.logoLight || defaultLogo;
  const projectDarkLogo = projectSettings.settings?.logoDark || defaultLogo;
  const activeLogo = isDarkMode.value
    ? (projectDarkLogo || projectLightLogo || '')
    : (projectLightLogo || projectDarkLogo || '');

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      isDarkMode.value = document.documentElement.classList.contains('dark');
    };

    updateTheme();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      cleanup(() => observer.disconnect());
    }
  });

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
              aria-label="Toggle sidebar"
            >
              <MenuIcon />
            </button>
          )}
          {/* Single brand logo + name: links to public homepage */}
          <Link
            href={R.PUBLIC.HOME}
            class="flex min-w-0 items-center gap-3 md:gap-4 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 dark:ring-offset-slate-800"
            aria-label={`${projectName} — go to homepage`}
          >
            {activeLogo ? (
              <img
                src={activeLogo}
                alt=""
                width="48"
                height="48"
                class="h-8 md:h-10 lg:h-12 w-auto shrink-0 object-contain"
              />
            ) : null}
            <h1 class="truncate text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
              {projectName}
            </h1>
          </Link>
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
