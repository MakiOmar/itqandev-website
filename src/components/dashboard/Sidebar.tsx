import { component$, type QRL, type Component, useContext, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { useAppRoutes } from '../../lib/constants/routes';
import { useAdminAuth } from '../../routes/[lang]/admin/layout';
import { ProjectSettingsContext } from '../../stores/project-settings-store';
import { isFeatureModuleEnabled, type FeatureModuleKey } from '../../lib/api/project-settings';
import { useTranslate, translateApp } from '../../lib/i18n/useTranslate';
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
  ServicesIcon,
  TestimonialsIcon,
  BlogIcon,
  MediaIcon,
} from './icons';

interface NavItem {
  label: string;
  href?: string;
  icon: Component<any>;
  /** When true, nav item stays active for nested paths (e.g. list + new + edit). */
  activeOnChildPaths?: boolean;
  children?: Array<{
    label: string;
    href: string;
    /** Hide child link when module off (backend config/features.php). */
    featureModule?: FeatureModuleKey;
  }>;
  /** Spatie permission name from GET /api/me */
  permission?: string;
  roles?: string[];
  /** Backend module toggle from GET /api/settings features */
  featureModule?: FeatureModuleKey;
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
  const { lang } = useTranslate();
  const locale = useSpeakLocale();
  const R = useAppRoutes();
  const userRole = auth.value?.user.role || 'user';
  const permissionSet = new Set(auth.value?.user.permissions ?? []);
  const settingsMenuOpen = useSignal(false);
  
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
      }
    };
    
    // Set initial value immediately (in case it changed between render and this task)
    updateUiState();
    
    // Watch for direction/theme class changes and update immediately when changed.
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateUiState);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
      });
      
      cleanup(() => observer.disconnect());
    }
  });
  
  // Project name from Laravel (logo is shown only in the dashboard header)
  const projectName = projectSettings.settings?.name || 'Dashboard';
  const featureFlags = projectSettings.settings?.features;

  const navItems: NavItem[] = [
    {
      label: translateApp(lang, 'sidebar.dashboard'),
      href: R.ADMIN.HOME,
      icon: DashboardIcon,
    },
    {
      label: translateApp(lang, 'sidebar.projects'),
      href: R.ADMIN.PROJECTS,
      icon: ProjectsIcon,
      activeOnChildPaths: true,
      permission: 'manage projects',
      featureModule: 'projects',
    },
    {
      label: translateApp(lang, 'sidebar.categories'),
      href: R.ADMIN.CATEGORIES,
      icon: CategoriesIcon,
      activeOnChildPaths: true,
      permission: 'manage categories',
      featureModule: 'categories',
    },
    {
      label: translateApp(lang, 'sidebar.skills'),
      href: R.ADMIN.SKILLS,
      icon: SkillsIcon,
      permission: 'manage skills',
      featureModule: 'skills',
    },
    {
      label: translateApp(lang, 'sidebar.services'),
      href: R.ADMIN.SERVICES,
      icon: ServicesIcon,
      activeOnChildPaths: true,
      permission: 'manage services',
      featureModule: 'services',
    },
    {
      label: translateApp(lang, 'sidebar.testimonials'),
      href: R.ADMIN.TESTIMONIALS,
      icon: TestimonialsIcon,
      activeOnChildPaths: true,
      permission: 'manage testimonials',
      featureModule: 'testimonials',
    },
    {
      label: translateApp(lang, 'sidebar.blog'),
      href: R.ADMIN.BLOG,
      icon: BlogIcon,
      activeOnChildPaths: true,
      permission: 'manage blog',
      featureModule: 'blog',
    },
    {
      label: translateApp(lang, 'sidebar.media'),
      href: R.ADMIN.MEDIA,
      icon: MediaIcon,
      permission: 'manage media',
      featureModule: 'media',
    },
    {
      label: translateApp(lang, 'sidebar.profile'),
      href: R.ADMIN.PROFILE,
      icon: ProfileIcon,
    },
    {
      label: translateApp(lang, 'sidebar.users'),
      href: R.ADMIN.USERS,
      icon: UsersIcon,
      permission: 'manage users',
      featureModule: 'users',
    },
    {
      label: translateApp(lang, 'sidebar.settings'),
      icon: SettingsIcon,
      children: [
        { label: translateApp(lang, 'settings.general'), href: R.ADMIN.SETTINGS_GENERAL },
        { label: translateApp(lang, 'settings.socialMedia'), href: R.ADMIN.SETTINGS_SOCIAL },
        { label: translateApp(lang, 'media.title'), href: R.ADMIN.SETTINGS_MEDIA, featureModule: 'media' },
        { label: translateApp(lang, 'settings.branding'), href: R.ADMIN.SETTINGS_BRANDING },
      ],
      roles: ['admin', 'super_admin'],
    },
    {
      label: translateApp(lang, 'sidebar.activityLogs'),
      href: R.ADMIN.ACTIVITY,
      icon: ActivityIcon,
      roles: ['super_admin'],
    },
    {
      label: translateApp(lang, 'sidebar.notifications'),
      href: R.ADMIN.NOTIFICATIONS,
      icon: NotificationsIcon,
    },
    {
      label: translateApp(lang, 'sidebar.systemHealth'),
      href: R.ADMIN.SYSTEM,
      icon: SystemHealthIcon,
      permission: 'manage system',
    },
  ];

  const filteredNavItems = navItems
    .map((item) => {
      if (!item.children?.length) {
        return item;
      }
      const children = item.children.filter(
        (ch) =>
          !ch.featureModule || isFeatureModuleEnabled(featureFlags, ch.featureModule),
      );
      return { ...item, children };
    })
    .filter((item) => {
      if (item.featureModule && !isFeatureModuleEnabled(featureFlags, item.featureModule)) {
        return false;
      }
      if (item.permission && !permissionSet.has(item.permission)) {
        return false;
      }
      if (item.roles && !item.roles.includes(userRole)) {
        return false;
      }
      return true;
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
        class={`fixed top-0 z-50 h-screen w-72 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out ${
          isRTL.value
            ? `right-0 ${props.isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-200/60 dark:border-slate-700/60`
            : `left-0 ${props.isOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-slate-200/60 dark:border-slate-700/60`
        }`}
      >
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between h-16 md:h-20 lg:h-28 px-4 sm:px-6 md:px-8 lg:px-10 border-b border-slate-200/60 dark:border-slate-700/60">
            <div class="flex min-w-0 flex-1 items-center">
              {/* Brand text only: logo lives in header; link matches header homepage */}
              <Link
                href={R.PUBLIC.HOME}
                class="min-w-0 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 dark:ring-offset-slate-800"
                aria-label={`${projectName} — go to homepage`}
                onClick$={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024 && props.onClose) {
                    props.onClose();
                  }
                }}
              >
                <h2 class="truncate text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
                  {projectName}
                </h2>
              </Link>
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
                  ? settingsMenuOpen.value || isInSection(R.ADMIN.SETTINGS)
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

                const active = item.href
                  ? item.activeOnChildPaths
                    ? isInSection(item.href)
                    : isActive(item.href)
                  : false;
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
