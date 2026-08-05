import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { Container } from '~/components/marketing/Container';
import { ChromeLayoutRenderer } from '~/components/marketing/chrome/ChromeLayoutRenderer';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import type { AuthSession } from '~/lib/auth/types';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteLanguageRow } from '~/types/site-language';
import type { FeatureModuleKey } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { getConfig } from '~/lib/config';
import { marketingRoutes } from '~/lib/marketing/constants';
import { ThemeToggle } from '~/components/marketing/ThemeToggle';
import { Button } from '~/components/marketing/Button';
import { SiteLanguageSwitcher } from '~/components/common/SiteLanguageSwitcher';
import { UserDropdown } from '~/components/common/UserDropdown';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { getFeatureModuleForPublicHref } from '~/lib/admin/feature-module-routes';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';

interface HeaderBranding {
  name: string;
  logo?: string;
  logoDark?: string;
  logoLight?: string;
  site_languages?: SiteLanguageRow[];
}

interface HeaderProps {
  session?: AuthSession | null;
  branding?: HeaderBranding | null;
  navItems?: PublicNavItem[] | null;
  features?: Partial<Record<FeatureModuleKey, boolean>> & Record<string, boolean>;
  overlayNav?: boolean;
  /** Page-layout document from shell `header.sections`. */
  headerSections?: PageSectionNode[] | null;
}

export const Header = component$<HeaderProps>((props) => {
  const menuOpen = useSignal(false);
  const isDarkMode = useSignal(false);
  const loc = useLocation();
  const uiLang = uiLangFromUrlPathname(loc.url.pathname);
  const sections = props.headerSections || [];
  const useBuilder = sections.length > 0;

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      isDarkMode.value = document.documentElement.classList.contains('dark');
    };
    updateTheme();
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      cleanup(() => observer.disconnect());
    }
  });

  const barClass = props.overlayNav
    ? 'absolute inset-x-0 top-0 z-40 border-b border-transparent bg-transparent'
    : 'sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90';

  if (useBuilder) {
    const mobileNav = (props.navItems?.length ? props.navItems : []).filter((item) => {
      const mod = getFeatureModuleForPublicHref(item.href);
      if (!mod) return true;
      return isFeatureModuleEnabled(props.features, mod);
    });

    return (
      <header class={barClass} data-site-header>
        <div class="relative py-3">
          <div class="flex items-center gap-2 px-4 sm:px-6 lg:px-8">
            <div class="min-w-0 flex-1">
              <ChromeLayoutRenderer
                sections={sections}
                uiLocale={uiLang}
                branding={props.branding}
                session={props.session}
                features={props.features}
                isDarkMode={isDarkMode.value}
                bandClass="flex items-center"
              />
            </div>
            {mobileNav.length > 0 ? (
              <button
                type="button"
                class="shrink-0 rounded-lg p-2 text-slate-700 lg:hidden dark:text-slate-200"
                aria-expanded={menuOpen.value}
                aria-label="Menu"
                onClick$={() => {
                  menuOpen.value = !menuOpen.value;
                }}
              >
                Menu
              </button>
            ) : null}
          </div>
          {menuOpen.value && mobileNav.length > 0 ? (
            <nav
              class="border-t border-slate-200 bg-white/95 px-4 py-3 lg:hidden dark:border-slate-700 dark:bg-slate-900/95"
              aria-label="Mobile"
            >
              <ul class="space-y-1">
                {mobileNav.map((item) => (
                  <li key={item.href + item.label}>
                    <MarketingLink
                      href={item.href}
                      class="block rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                      onClick$={() => {
                        menuOpen.value = false;
                      }}
                    >
                      {item.label}
                    </MarketingLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>
    );
  }

  // Legacy fallback when shell has no header document.
  const config = getConfig();
  const MR = marketingRoutes(uiLang);
  const appRoutes = getLocalizedRoutes(uiLang);
  const brandName = props.branding?.name || config.branding.name;
  const defaultLogo = resolveLaravelMediaUrl(props.branding?.logo || '');
  const lightLogo = resolveLaravelMediaUrl(props.branding?.logoLight || defaultLogo);
  const darkLogo = resolveLaravelMediaUrl(props.branding?.logoDark || defaultLogo);
  const activeLogo = isDarkMode.value
    ? darkLogo || lightLogo || defaultLogo
    : lightLogo || darkLogo || defaultLogo;
  const defaultNav: PublicNavItem[] = [
    { label: 'Home', href: MR.home, open_in_new_tab: false },
    { label: 'Services', href: MR.services, open_in_new_tab: false },
    { label: 'Portfolio', href: MR.portfolio, open_in_new_tab: false },
    { label: 'About', href: MR.about, open_in_new_tab: false },
    { label: 'Pricing', href: MR.pricing, open_in_new_tab: false },
    { label: 'Blog', href: MR.blog, open_in_new_tab: false },
    { label: 'Contact', href: MR.contact, open_in_new_tab: false },
  ];
  const navLinks = (props.navItems?.length ? props.navItems : defaultNav).filter((item) => {
    const mod = getFeatureModuleForPublicHref(item.href);
    if (!mod) return true;
    return isFeatureModuleEnabled(props.features, mod);
  });

  return (
    <header class={barClass} data-site-header>
      <Container>
        <div class="flex h-16 items-center justify-between gap-4">
          <MarketingLink href={MR.home} class="inline-flex items-center gap-2">
            {activeLogo ? (
              <img src={activeLogo} alt={brandName} class="h-8 w-auto" width={120} height={32} />
            ) : (
              <span class="text-lg font-bold text-slate-900 dark:text-white">{brandName}</span>
            )}
          </MarketingLink>
          <nav class="hidden items-center gap-1 lg:flex" aria-label="Main">
            {navLinks.map((item) => (
              <MarketingLink
                key={item.href}
                href={item.href}
                class="rounded-lg px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {item.label}
              </MarketingLink>
            ))}
          </nav>
          <div class="flex items-center gap-2">
            <ThemeToggle />
            {(props.branding?.site_languages?.length || 0) > 1 ? (
              <SiteLanguageSwitcher languages={props.branding?.site_languages || []} />
            ) : null}
            {props.session?.user ? (
              <UserDropdown session={props.session} />
            ) : (
              <Button href={appRoutes.ADMIN.LOGIN} variant="outline" class="text-sm">
                Login
              </Button>
            )}
            <Button href={MR.contact} class="hidden text-sm sm:inline-flex">
              Get in touch
            </Button>
            <button
              type="button"
              class="lg:hidden rounded-lg p-2 text-slate-700 dark:text-slate-200"
              aria-expanded={menuOpen.value}
              onClick$={() => {
                menuOpen.value = !menuOpen.value;
              }}
            >
              Menu
            </button>
          </div>
        </div>
        {menuOpen.value ? (
          <nav class="border-t border-slate-200 py-3 lg:hidden dark:border-slate-700" aria-label="Mobile">
            <ul class="space-y-1">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <MarketingLink
                    href={item.href}
                    class="block rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                    onClick$={() => {
                      menuOpen.value = false;
                    }}
                  >
                    {item.label}
                  </MarketingLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </Container>
    </header>
  );
});
