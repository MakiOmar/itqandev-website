import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { ChromeLayoutRenderer } from '~/components/marketing/chrome/ChromeLayoutRenderer';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import type { AuthSession } from '~/lib/auth/types';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteLanguageRow } from '~/types/site-language';
import type { FeatureModuleKey } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import { defaultHeaderSections } from '~/lib/marketing/chrome-defaults';

interface HeaderBranding {
  name: string;
  logo?: string;
  logoDark?: string;
  logoLight?: string;
  site_languages?: SiteLanguageRow[];
}

interface HeaderProps {
  session?: Pick<AuthSession, 'user'> | null;
  branding?: HeaderBranding | null;
  navItems?: PublicNavItem[] | null;
  features?: Partial<Record<FeatureModuleKey, boolean>> & Record<string, boolean>;
  overlayNav?: boolean;
  /** Page-layout document from shell `header.sections`. */
  headerSections?: PageSectionNode[] | null;
}

export const Header = component$<HeaderProps>((props) => {
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
    : 'sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-700/80';

  return (
    <header class={barClass} data-site-header>
      {/* Blur lives on a layer: backdrop-filter on <header> would trap the mobile menu's fixed panel inside the bar */}
      {props.overlayNav ? null : (
        <div class="absolute inset-0 -z-10 bg-white/90 backdrop-blur dark:bg-slate-900/90" aria-hidden="true" />
      )}
      <div class="relative py-3">
        {/* Match marketing `Container` default (`max-w-6xl`) — not `max-w-7xl` */}
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <ChromeLayoutRenderer
            sections={sections}
            uiLocale={uiLang}
            branding={props.branding}
            session={props.session}
            features={props.features}
            isDarkMode={isDarkMode.value}
            embedInParent={true}
          />
        </div>
      </div>
    </header>
  );
});
