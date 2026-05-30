import '~/styles/site.css';
import { component$, Slot, useSignal } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { ParticlesBackground } from '~/components/marketing/ParticlesBackground';
import { auth } from '~/lib/auth';
import { useDevClientMarketingHydration } from '~/lib/marketing/dev-client-marketing';
import {
  fetchPublicShell,
  type PublicBrandingState,
  type PublicShellState,
} from '~/lib/marketing/public-shell';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { SiteContent } from '~/lib/marketing/types';

/**
 * One Laravel round-trip for branding, primary menu, and services merged into site content.
 */
export const usePublicShell = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  return fetchPublicShell(uiLocale, { forwardDocumentUrl: request.url });
});

export type { PublicBrandingState, PublicShellState, SiteContent };

/**
 * Load authenticated user session for public header UI.
 * If auth check fails, keep public pages accessible.
 */
export const usePublicAuth = routeLoader$(async ({ cookie, request }) => {
  try {
    return await auth.getSession(cookie, request.url);
  } catch {
    return null;
  }
});

/**
 * Public marketing layout: Header + main + Footer.
 */
export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shellLoader = usePublicShell();
  const authSession = usePublicAuth();
  const branding = useSignal<PublicBrandingState>(shellLoader.value.branding);
  const primaryMenu = useSignal<PublicNavItem[]>(shellLoader.value.primaryMenu);
  useDevClientMarketingHydration(branding, primaryMenu, uiLocale);
  const contact = shellLoader.value.siteContent?.contact;

  return (
    <div
      data-public-page
      class="relative isolate min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300"
    >
      {/* Full-viewport particles behind page chrome + content */}
      <ParticlesBackground />
      <div class="relative z-10 flex min-h-screen flex-1 flex-col">
        <Header
          session={authSession.value}
          branding={branding.value}
          navItems={primaryMenu.value}
          features={branding.value?.features}
        />
        <main class="flex-1 overflow-y-auto">
          <Slot />
        </main>
        <Footer contact={contact} branding={branding.value} />
      </div>
    </div>
  );
});
