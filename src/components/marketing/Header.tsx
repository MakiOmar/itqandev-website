import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { ThemeToggle } from '~/components/marketing/ThemeToggle';
import { Button } from '~/components/marketing/Button';
import { Container } from '~/components/marketing/Container';
import { UserDropdown } from '~/components/common/UserDropdown';
import { SiteLanguageSwitcher } from '~/components/common/SiteLanguageSwitcher';
import type { AuthSession } from '~/lib/auth/types';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteLanguageRow } from '~/types/site-language';
import { isFeatureModuleEnabled, type FeatureModuleKey } from '~/lib/api/project-settings';
import { getFeatureModuleForPublicHref } from '~/lib/admin/feature-module-routes';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';

interface HeaderBranding {
  name: string;
  logo?: string;
  logoDark?: string;
  logoLight?: string;
  /** From settings API; used to show the language switcher when multiple UI locales are available */
  site_languages?: SiteLanguageRow[];
}

interface HeaderProps {
  session?: AuthSession | null;
  branding?: HeaderBranding | null;
  /** When non-empty, replaces the default marketing nav (from GET /api/public/menus/primary). */
  navItems?: PublicNavItem[] | null;
  /** Module toggles from GET /api/public/site-meta */
  features?: Partial<Record<FeatureModuleKey, boolean>> & Record<string, boolean>;
}

export const Header = component$<HeaderProps>((props) => {
  const menuOpen = useSignal(false);
  const isDarkMode = useSignal(false);
  const config = getConfig();
  const loc = useLocation();
  const uiLang = uiLangFromUrlPathname(loc.url.pathname);
  const MR = marketingRoutes(uiLang);
  const appRoutes = getLocalizedRoutes(uiLang);
  const loginHref = appRoutes.ADMIN.LOGIN;
  const user = props.session?.user;
  const brandName = props.branding?.name || config.branding.name;
  const defaultLogo = resolveLaravelMediaUrl(props.branding?.logo || '');
  const lightLogo = resolveLaravelMediaUrl(props.branding?.logoLight || defaultLogo);
  const darkLogo = resolveLaravelMediaUrl(props.branding?.logoDark || defaultLogo);
  const activeLogo = isDarkMode.value
    ? (darkLogo || lightLogo || defaultLogo)
    : (lightLogo || darkLogo || defaultLogo);

  const defaultNav: PublicNavItem[] = [
    { label: 'Home', href: MR.home, open_in_new_tab: false },
    { label: 'Services', href: MR.services, open_in_new_tab: false },
    { label: 'Work', href: MR.work, open_in_new_tab: false },
    { label: 'About', href: MR.about, open_in_new_tab: false },
    { label: 'Pricing', href: MR.pricing, open_in_new_tab: false },
    { label: 'Blog', href: MR.blog, open_in_new_tab: false },
    { label: 'Contact', href: MR.contact, open_in_new_tab: false },
  ];

  const filterByFeatures = (items: PublicNavItem[]) =>
    items.filter((item) => {
      const mod = getFeatureModuleForPublicHref(item.href);
      if (!mod) {
        return true;
      }
      return isFeatureModuleEnabled(props.features, mod);
    });

  const navLinks = filterByFeatures(
    props.navItems && props.navItems.length > 0 ? props.navItems : defaultNav,
  );

  const linkClass =
    'rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

  const isExternal = (href: string) => /^https?:\/\//i.test(href);

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

  const closeMenu = $(() => {
    menuOpen.value = false;
  });

  return (
    <header
      class="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/80"
      role="banner"
    >
      <Container class="flex h-16 w-full items-center justify-between gap-3 md:justify-start sm:h-18">
        {/* Logo — keep away from main nav cluster */}
        <Link
          href={MR.home}
          class="inline-flex shrink-0 items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"
          aria-label="Home"
        >
          {activeLogo && (
            <img
              src={activeLogo}
              alt={brandName}
              width={120}
              height={32}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              class="h-8 max-w-logo object-contain"
            />
          )}
          {activeLogo ? <span class="sr-only">{brandName}</span> : <span>{brandName}</span>}
        </Link>

        {/* Main menu — centered in the middle column on desktop only */}
        <div class="hidden min-w-0 flex-1 md:flex md:justify-center">
          <nav class="flex flex-wrap items-center justify-center gap-1" aria-label="Main">
            {navLinks.map((item, i) => (
              <span key={`${item.href}-${i}`}>
                {isExternal(item.href) ? (
                  <a
                    href={item.href}
                    class={linkClass}
                    target={item.open_in_new_tab ? '_blank' : undefined}
                    rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} class={linkClass}>
                    {item.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Theme, CTA, user menu — language switcher last (furthest from main nav) */}
        <div class="flex shrink-0 items-center gap-2 md:ml-auto">
          <ThemeToggle />
          <div class="hidden sm:flex sm:items-center sm:gap-2">
            <Button href={MR.contact} variant="primary">
              Get in touch
            </Button>
            {user ? (
              <UserDropdown user={user} />
            ) : (
              <Button href={loginHref} variant="outline">
                Login
              </Button>
            )}
          </div>
          <SiteLanguageSwitcher languages={props.branding?.site_languages} />

          {/* Mobile menu button */}
          <button
            type="button"
            class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen.value}
            onClick$={() => (menuOpen.value = !menuOpen.value)}
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen.value ? (
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {menuOpen.value && (
        <div
          class="border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900 dark:backdrop-blur-none md:hidden"
          role="dialog"
          aria-label="Mobile menu"
        >
          <nav class="flex flex-col px-4 py-4" aria-label="Main mobile">
            {navLinks.map((item, i) => (
              <div key={`m-${item.href}-${i}`} class="flex flex-col">
                {isExternal(item.href) ? (
                  <a
                    href={item.href}
                    class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    target={item.open_in_new_tab ? '_blank' : undefined}
                    rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                    onClick$={closeMenu}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick$={closeMenu}
                  >
                    {item.label}
                  </Link>
                )}
                {item.children && item.children.length > 0 ? (
                  <ul class="ml-3 border-l border-slate-200 py-1 pl-3 dark:border-slate-700">
                    {item.children.map((child, j) => (
                      <li key={`mc-${child.href}-${j}`}>
                        {isExternal(child.href) ? (
                          <a
                            href={child.href}
                            class="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            target={child.open_in_new_tab ? '_blank' : undefined}
                            rel={child.open_in_new_tab ? 'noopener noreferrer' : undefined}
                            onClick$={closeMenu}
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            href={child.href}
                            class="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            onClick$={closeMenu}
                          >
                            {child.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            <div class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <Button href={MR.contact} variant="primary" class="w-full justify-center">
                Get in touch
              </Button>
              {user ? (
                <div class="flex justify-center">
                  <UserDropdown user={user} />
                </div>
              ) : (
                <Button href={loginHref} variant="outline" class="w-full justify-center">
                  Login
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
});
