import { component$, Slot, useSignal } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getSiteContent } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { ParticlesBackground } from '~/components/marketing/ParticlesBackground';
import { auth } from '~/lib/auth';
import { extractCookieHeader, getApiClient } from '~/lib/api/client';
import { marketingGet } from '~/lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { resolvePublicSiteLanguages } from '~/lib/i18n/public-site-languages';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import { getConfig } from '~/lib/config';
import {
  useDevClientMarketingHydration,
  type PublicBrandingState,
} from '~/lib/marketing/dev-client-marketing';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';

/**
 * Load site content once for layout (footer contact/socials).
 */
export const useSiteContent = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  return getSiteContent(uiLocale, { forwardDocumentUrl: request.url });
});

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
 * Load public branding from unauthenticated GET /api/public/site-meta (logos + site_languages).
 * Authenticated GET /settings is not available to guests, so the header used to hide the language switcher until login.
 */
/**
 * Primary header menu from Laravel (`menus` table, slug `primary`). Empty → Header uses built-in links.
 */
export const usePublicPrimaryMenu = routeLoader$(async ({ cookie, request, params }) => {
  const cookieHeader = extractCookieHeader(cookie, request);
  const apiClient = getApiClient(cookieHeader);
  const cookieStr = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookieStr, params.lang, request.url) ?? 'en';

  try {
    const path = `${MARKETING_ENDPOINTS.menuBySlug('primary')}?locale=${encodeURIComponent(uiLocale)}`;
    const response = await apiClient.get<{ items?: PublicNavItem[] }>(path);
    const payload = response?.data as { items?: PublicNavItem[] } | undefined;
    const items = payload?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [] as PublicNavItem[];
  }
});

export const usePublicBranding = routeLoader$(async ({ cookie, request }) => {
  const fallbackName = getConfig().branding.name;
  const cookieHeader = extractCookieHeader(cookie, request);

  try {
    const settings = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta, null, {
      forwardCookies: cookieHeader,
      forwardDocumentUrl: request.url,
    });

    const name =
      (typeof settings?.site_name === 'string' && settings.site_name) ||
      (typeof settings?.name === 'string' && settings.name) ||
      fallbackName;
    const logo = (settings?.logo as string) || (settings?.site_logo as string) || '';
    const logoDark =
      (settings?.logoDark as string) ||
      (settings?.logo_dark as string) ||
      (settings?.dark_logo as string) ||
      (settings?.site_logo_dark as string) ||
      '';
    const logoLight =
      (settings?.logoLight as string) ||
      (settings?.logo_light as string) ||
      (settings?.light_logo as string) ||
      (settings?.site_logo_light as string) ||
      '';

    const site_languages = resolvePublicSiteLanguages(settings?.site_languages);

    const features =
      settings?.features && typeof settings.features === 'object'
        ? (settings.features as Record<string, boolean>)
        : undefined;

    return {
      name,
      logo,
      logoDark,
      logoLight,
      site_languages,
      features,
    };
  } catch {
    return {
      name: fallbackName,
      logo: '',
      logoDark: '',
      logoLight: '',
      site_languages: resolvePublicSiteLanguages(null),
      features: undefined as Record<string, boolean> | undefined,
    };
  }
});

/**
 * Public marketing layout: Header + main + Footer.
 */
export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const siteContent = useSiteContent();
  const authSession = usePublicAuth();
  const brandingLoader = usePublicBranding();
  const branding = useSignal<PublicBrandingState>(brandingLoader.value);
  const primaryMenuLoader = usePublicPrimaryMenu();
  const primaryMenu = useSignal<PublicNavItem[]>(primaryMenuLoader.value);
  useDevClientMarketingHydration(branding, primaryMenu, uiLocale);
  const contact = siteContent.value?.contact;

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
