import '~/styles/site.css';
import { component$, Slot, useContextProvider, useSignal, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import {
  PublicDocumentNavContext,
  shouldUsePublicDocumentNav,
} from '~/lib/marketing/public-document-nav-context';
import { detectLayoutBreakpointFromUserAgent } from '~/lib/marketing/device-visibility';
import { LayoutDeviceProvider } from '~/lib/marketing/layout-device-context';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname, stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';
import { LocaleTransitionProvider } from '~/components/common/LocaleTransitionOverlay';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { PublicShellTypographyHead } from '~/components/perf/PublicShellTypographyHead';
import { defaultSystemTypography } from '~/lib/perf/typography';
import { auth } from '~/lib/auth';
import { useDevClientMarketingHydration } from '~/lib/marketing/dev-client-marketing';
import {
  fetchPublicShell,
  type PublicBrandingState,
  type PublicShellState,
} from '~/lib/marketing/public-shell';
import { marketingRoutes } from '~/lib/marketing/constants';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteContent } from '~/lib/marketing/types';
import type { HomepageSectionInstance } from '~/lib/marketing/appearance-types';
import { isSearchEngineIndexingEnabled, publicRobotsContent } from '~/lib/seo/search-engine-indexing';
import { pathLooksLikeFrontPageAlias } from '~/lib/marketing/static-homepage';

/**
 * One Laravel round-trip for branding, primary menu, and services merged into site content.
 */
export const usePublicShell = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  return fetchPublicShell(uiLocale, { forwardDocumentUrl: request.url });
});

/** Canonical `/` when a CMS page is assigned as the WordPress-style static homepage. */
export const useFrontPageCanonicalRedirect = routeLoader$(async ({ url, params, redirect, resolveValue }) => {
  const shell = await resolveValue(usePublicShell);
  const slug = shell.frontPage?.slug;
  if (!slug) {
    return null;
  }
  const logical = stripUiLocaleFromPathname(url.pathname);
  if (!pathLooksLikeFrontPageAlias(logical, slug)) {
    return null;
  }
  throw redirect(301, marketingRoutes(params.lang).home);
});

export type { PublicBrandingState, PublicShellState, SiteContent };

/**
 * Load authenticated user session for public header UI.
 * If auth check fails, keep public pages accessible.
 */

/**
 * UA-based layout breakpoint for Advanced responsive visibility (SSR omit, not CSS).
 */
export const usePublicLayoutDevice = routeLoader$(({ request }) => {
  return detectLayoutBreakpointFromUserAgent(request.headers.get('user-agent'));
});

export const usePublicAuth = routeLoader$(async ({ cookie, request }) => {
  try {
    return await auth.getSession(cookie, request.url);
  } catch {
    return null;
  }
});

function isPublicHomePath(pathname: string, uiLocale: string): boolean {
  const home = marketingRoutes(uiLocale).home.replace(/\/+$/, '') || '/';
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === home;
}

function heroWantsOverlayNav(sections: HomepageSectionInstance[] | undefined): boolean {
  if (!sections?.length) return false;
  const hero = sections.find((s) => s.type === 'hero');
  if (!hero) return false;
  const v = hero.settings?.full_viewport;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * Public marketing layout: Header + main + Footer.
 */
export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shellLoader = usePublicShell();
  useFrontPageCanonicalRedirect();
  const authSession = usePublicAuth();
  const layoutDevice = usePublicLayoutDevice();
  const branding = useSignal<PublicBrandingState>(shellLoader.value.branding);
  const primaryMenu = useSignal<PublicNavItem[]>(shellLoader.value.primaryMenu);
  useDevClientMarketingHydration(branding, primaryMenu, uiLocale);
  const contact = shellLoader.value.siteContent?.contact;
  const overlayNav =
    isPublicHomePath(loc.url.pathname, uiLocale) &&
    heroWantsOverlayNav(
      (shellLoader.value.themeBody && shellLoader.value.themeBody.length > 0
        ? (shellLoader.value.themeBody as unknown as HomepageSectionInstance[])
        : shellLoader.value.homepageSections) as HomepageSectionInstance[],
    );

  const documentNav = useSignal(
    shouldUsePublicDocumentNav(loc.url.pathname, shellLoader.value.themeContext),
  );
  useTask$(({ track }) => {
    const path = track(() => loc.url.pathname);
    const themeContext = track(() => shellLoader.value.themeContext);
    documentNav.value = shouldUsePublicDocumentNav(path, themeContext);
  });
  useContextProvider(PublicDocumentNavContext, documentNav);

  return (
    <div
      data-public-page
      data-hero-overlay-nav={overlayNav ? 'true' : undefined}
      class="relative isolate min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300"
    >
      <PublicShellTypographyHead
        typography={branding.value.typography ?? shellLoader.value.branding?.typography ?? defaultSystemTypography()}
      />
      <LocaleTransitionProvider>
        <LayoutDeviceProvider device={layoutDevice.value}>
        <div class="relative z-10 flex min-h-screen flex-1 flex-col">
          <Header
            session={authSession.value}
            branding={branding.value}
            navItems={primaryMenu.value}
            features={branding.value?.features}
            overlayNav={overlayNav}
            headerSections={shellLoader.value.header?.sections ?? []}
          />
          <main class="flex-1 overflow-y-auto">
            <Slot />
          </main>
          <Footer
            contact={contact}
            branding={branding.value}
            footer={shellLoader.value.footer}
          />
        </div>
        </LayoutDeviceProvider>
      </LocaleTransitionProvider>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  try {
    const shell = resolveValue(usePublicShell);
    const robots = publicRobotsContent({
      siteIndexingEnabled: isSearchEngineIndexingEnabled(shell.branding?.search_engine_indexing),
    });
    if (!robots) {
      return {};
    }
    return { meta: [{ name: 'robots', content: robots }] };
  } catch {
    return {};
  }
};
