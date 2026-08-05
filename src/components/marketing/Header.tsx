import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { ChromeLayoutRenderer } from '~/components/marketing/chrome/ChromeLayoutRenderer';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import type { AuthSession } from '~/lib/auth/types';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteLanguageRow } from '~/types/site-language';
import type { FeatureModuleKey } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { getFeatureModuleForPublicHref } from '~/lib/admin/feature-module-routes';
import { defaultHeaderSections } from '~/lib/marketing/chrome-defaults';

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
  const navItems = props.navItems || [];
  const sections =
    props.headerSections && props.headerSections.length > 0
      ? props.headerSections
      : defaultHeaderSections(navItems);

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

  const mobileNav = navItems.filter((item) => {
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
});
