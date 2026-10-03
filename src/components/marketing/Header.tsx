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

  // Positioning only: background, border, padding and width come from the header builder bands.
  const barClass = props.overlayNav ? 'absolute inset-x-0 top-0 z-40' : 'sticky top-0 z-40';

  return (
    <header class={barClass} data-site-header>
      <ChromeLayoutRenderer
        sections={sections}
        uiLocale={uiLang}
        branding={props.branding}
        session={props.session}
        features={props.features}
        isDarkMode={isDarkMode.value}
      />
    </header>
  );
});
