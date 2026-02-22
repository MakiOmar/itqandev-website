import { component$, type QRL, type Component, useContext, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { ROUTES } from '../../lib/constants/routes';
import { useAdminAuth } from '../../routes/admin/layout';
import { ProjectSettingsContext } from '../../stores/project-settings-store';
import { useTranslate } from '../../lib/i18n/useTranslate';
import {
  DashboardIcon,
  ProfileIcon,
  UsersIcon,
  SettingsIcon,
  ActivityIcon,
  NotificationsIcon,
  SystemHealthIcon,
  CloseIcon,
  ProjectsIcon,
  CategoriesIcon,
  SkillsIcon,
  TestimonialsIcon,
  BlogIcon,
  MediaIcon,
} from './icons';

interface NavItem {
  label: string;
  href?: string;
  icon: Component<any>;
  children?: Array<{
    label: string;
    href: string;
  }>;
  roles?: string[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose?: QRL<() => void>;
}

/**
 * Dashboard sidebar navigation with toggle functionality
 * Uses project settings (logo, name) from Laravel API
 */
export const Sidebar = component$<SidebarProps>((props) => {
  const location = useLocation();
  const auth = useAdminAuth();
  const projectSettings = useContext(ProjectSettingsContext);
  const { t } = useTranslate();
  const locale = useSpeakLocale();
  const userRole = auth.value?.user.role || 'user';
  const settingsMenuOpen = useSignal(false);
  const isDarkMode = useSignal(false);
  
  // Check direction directly from document attribute (set immediately by blocking script)
  // This ensures sidebar position changes simultaneously with direction, preventing flash
  // Initialize from locale for SSR, then sync with document attribute on client
  const isRTL = useSignal(locale.lang === 'ar');
  
  // Track direction from document attribute and update immediately
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateUiState = () => {
      if (typeof document !== 'undefined') {
        const dir = document.documentElement.getAttribute('dir');
        // Update immediately - this will trigger re-render with correct position
        if (isRTL.value !== (dir === 'rtl')) {
          isRTL.value = dir === 'rtl';
        }
        const isDark = document.documentElement.classList.contains('dark');
        if (isDarkMode.value !== isDark) {
          isDarkMode.value = isDark;
        }
      }
    };
    
    // Set initial value immediately (in case it changed between render and this task)
    updateUiState();
    
    // Watch for direction/theme class changes and update immediately when changed.
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateUiState);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir', 'class'],
      });
      
      cleanup(() => observer.disconnect());
    }
  });
  
  // Get project name and logo from Laravel settings
  const projectName = projectSettings.settings?.name || 'Dashboard';
  const defaultLogo = projectSettings.settings?.logo;
  const projectLightLogo = projectSettings.settings?.logoLight || defaultLogo;
  const projectDarkLogo = projectSettings.settings?.logoDark || defaultLogo;
  const activeLogo = isDarkMode.value
    ? (projectDarkLogo || projectLightLogo || '')
    : (projectLightLogo || projectDarkLogo || '');
  
  // Get first letter of project name for fallback icon
  const projectInitial = projectName.charAt(0).toUpperCase();

  const navItems: NavItem[] = [
    {
      label: t('sidebar.dashboard'),
      href: ROUTES.ADMIN.HOME,
      icon: DashboardIcon,
    },
    {
      label: t('sidebar.projects'),
      href: ROUTES.ADMIN.PROJECTS,
      icon: ProjectsIcon,
    },
    {
      label: t('sidebar.categories'),
      href: ROUTES.ADMIN.CATEGORIES,
      icon: CategoriesIcon,
    },
    {
      label: t('sidebar.skills'),
      href: ROUTES.ADMIN.SKILLS,
      icon: SkillsIcon,
    },
    {
      label: t('sidebar.testimonials'),
      href: ROUTES.ADMIN.TESTIMONIALS,
      icon: TestimonialsIcon,
    },
    {
      label: t('sidebar.blog'),
      href: ROUTES.ADMIN.BLOG,
      icon: BlogIcon,
    },
    {
      label: t('sidebar.media'),
      href: ROUTES.ADMIN.MEDIA,
      icon: MediaIcon,
    },
    {
      label: t('sidebar.profile'),
      href: ROUTES.ADMIN.PROFILE,
      icon: ProfileIcon,
    },
    {
      label: t('sidebar.users'),
      href: ROUTES.ADMIN.USERS,
      icon: UsersIcon,
      roles: ['admin', 'super_admin'],
    },
    {
      label: t('sidebar.settings'),
      icon: SettingsIcon,
      children: [
        { label: t('settings.general'), href: ROUTES.ADMIN.SETTINGS_GENERAL },
        { label: t('settings.socialMedia'), href: ROUTES.ADMIN.SETTINGS_SOCIAL },
        { label: t('media.title'), href: ROUTES.ADMIN.SETTINGS_MEDIA },
        { label: t('settings.branding'), href: ROUTES.ADMIN.SETTINGS_BRANDING },
      ],
      roles: ['admin', 'super_admin'],
    },
    {
      label: t('sidebar.activityLogs'),
      href: ROUTES.ADMIN.ACTIVITY,
      icon: ActivityIcon,
      roles: ['super_admin'],
    },
    {
      label: t('sidebar.notifications'),
      href: ROUTES.ADMIN.NOTIFICATIONS,
      icon: NotificationsIcon,
    },
    {
      label: t('sidebar.systemHealth'),
      href: ROUTES.ADMIN.SYSTEM,
      icon: SystemHealthIcon,
      roles: ['super_admin'],
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const isActive = (href: string) => {
    const current = location.url.pathname.replace(/\/+$/, '') || '/';
    const target = href.replace(/\/+$/, '') || '/';
    return current === target;
  };

  const isInSection = (href: string) => {
    const current = location.url.pathname.replace(/\/+$/, '') || '/';
    const target = href.replace(/\/+$/, '') || '/';
    return current === target || current.startsWith(`${target}/`);
  };

  return (
    <>
      {/* Component: Sidebar */}
      {/* Sidebar - RTL aware positioning */}
      <aside
        class={`fixed top-0 left-0 right-0 z-50 h-screen w-72 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out ${
          isRTL.value 
            ? `${props.isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-200/60 dark:border-slate-700/60`
            : `${props.isOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-slate-200/60 dark:border-slate-700/60`
        }`}
      >
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between h-16 md:h-20 lg:h-28 px-4 sm:px-6 md:px-8 lg:px-10 border-b border-slate-200/60 dark:border-slate-700/60">
            <div class="flex items-center gap-2 md:gap-4">
              {/* Project logo from Laravel (if available), otherwise show initial */}
              {activeLogo ? (
                <img
                  src={activeLogo}
                  alt={projectName}
                  width="48"
                  height="48"
                  class="h-10 w-10 md:h-12 md:w-12 rounded-xl object-contain flex-shrink-0"
                />
              ) : (
                <div class="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                  <span class="text-white font-bold text-lg md:text-xl">{projectInitial}</span>
                </div>
              )}
              {/* Project name from Laravel */}
              <h2 class="text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                {projectName}
              </h2>
            </div>
            {props.onClose && (
              <button
                onClick$={props.onClose}
                type="button"
                class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close sidebar"
              >
                <CloseIcon />
              </button>
            )}
          </div>
          <nav class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 lg:py-10">
            <div class="space-y-2 md:space-y-3">
              {filteredNavItems.map((item) => {
                const IconComponent = item.icon;
                const hasChildren = !!item.children?.length;
                const sectionActive = hasChildren
                  ? item.children!.some((child) => isActive(child.href))
                  : item.href
                    ? isActive(item.href)
                    : false;
                const sectionOpen = hasChildren
                  ? settingsMenuOpen.value || isInSection(ROUTES.ADMIN.SETTINGS)
                  : false;

                if (hasChildren) {
                  return (
                    <div key={item.label} class="space-y-1">
                      <button
                        type="button"
                        onClick$={() => {
                          settingsMenuOpen.value = !sectionOpen;
                        }}
                        class={`group flex w-full items-center gap-3 md:gap-4 rounded-lg md:rounded-xl px-3 md:px-5 py-2.5 md:py-4 text-sm md:text-base font-medium transition-all duration-300 ${
                          sectionActive
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100/50 dark:shadow-blue-900/50'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-sm'
                        }`}
                        aria-expanded={sectionOpen}
                        aria-label={item.label}
                      >
                        <span
                          class={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                            sectionActive
                              ? 'text-blue-600 scale-110'
                              : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                          }`}
                        >
                          <IconComponent />
                        </span>
                        <span
                          class={`flex-1 text-left font-medium ${sectionActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {item.label}
                        </span>
                        <span
                          class={`transition-transform duration-200 ${sectionOpen ? 'rotate-90' : ''} ${
                            sectionActive ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        >
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </button>

                      {sectionOpen && (
                        <div class="space-y-1 pl-10">
                          {item.children!.map((child) => {
                            const childActive = isActive(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick$={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 1024 && props.onClose) {
                                    props.onClose();
                                  }
                                }}
                                class={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                                  childActive
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = item.href ? isActive(item.href) : false;
                return (
                  <Link
                    key={item.href || item.label}
                    href={item.href || '#'}
                    onClick$={() => {
                      // Only close sidebar on mobile devices (screen width < 1024px)
                      // On desktop (lg breakpoint and above), keep sidebar open
                      if (typeof window !== 'undefined' && window.innerWidth < 1024 && props.onClose) {
                        props.onClose();
                      }
                    }}
                    class={`group flex items-center gap-3 md:gap-4 rounded-lg md:rounded-xl px-3 md:px-5 py-2.5 md:py-4 text-sm md:text-base font-medium transition-all duration-300 ${
                      active
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100/50 dark:shadow-blue-900/50'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-sm'
                    }`}
                  >
                    <span class={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                      active 
                        ? 'text-blue-600 scale-110' 
                        : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                    }`}>
                      <IconComponent />
                    </span>
                    <span class={`font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
});
