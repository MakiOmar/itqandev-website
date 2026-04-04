import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getSiteContent } from '~/lib/marketing/content-layer';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { ParticlesBackground } from '~/components/marketing/ParticlesBackground';
import { auth } from '~/lib/auth';
import { getApiClient, extractCookieHeader } from '~/lib/api/client';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { getConfig } from '~/lib/config';
import type { SiteLanguageRow } from '~/types/site-language';

/**
 * Load site content once for layout (footer contact/socials).
 */
export const useSiteContent = routeLoader$(async () => {
  return getSiteContent();
});

/**
 * Load authenticated user session for public header UI.
 * If auth check fails, keep public pages accessible.
 */
export const usePublicAuth = routeLoader$(async ({ cookie }) => {
  try {
    return await auth.getSession(cookie);
  } catch {
    return null;
  }
});

/**
 * Load public branding from unauthenticated GET /api/public/site-meta (logos + site_languages).
 * Authenticated GET /settings is not available to guests, so the header used to hide the language switcher until login.
 */
export const usePublicBranding = routeLoader$(async ({ cookie, request }) => {
  const fallbackName = getConfig().branding.name;

  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<Record<string, any>>(MARKETING_ENDPOINTS.siteMeta);
    const settings = (response?.data ?? response) as Record<string, any>;

    const name = settings?.site_name || settings?.name || fallbackName;
    const logo = settings?.logo || settings?.site_logo || '';
    const logoDark =
      settings?.logoDark || settings?.logo_dark || settings?.dark_logo || settings?.site_logo_dark || '';
    const logoLight =
      settings?.logoLight || settings?.logo_light || settings?.light_logo || settings?.site_logo_light || '';

    const site_languages = Array.isArray(settings?.site_languages)
      ? (settings.site_languages as SiteLanguageRow[])
      : [];

    return {
      name,
      logo,
      logoDark,
      logoLight,
      site_languages,
    };
  } catch {
    return {
      name: fallbackName,
      logo: '',
      logoDark: '',
      logoLight: '',
      site_languages: [] as SiteLanguageRow[],
    };
  }
});

/**
 * Public marketing layout: Header + main + Footer.
 */
export default component$(() => {
  const siteContent = useSiteContent();
  const authSession = usePublicAuth();
  const branding = usePublicBranding();
  const contact = siteContent.value?.contact;

  return (
    <div
      data-public-page
      class="relative isolate min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300"
    >
      {/* Full-viewport particles behind page chrome + content */}
      <ParticlesBackground />
      <div class="relative z-10 flex min-h-screen flex-1 flex-col">
        <Header session={authSession.value} branding={branding.value} />
        <main class="flex-1 overflow-y-auto">
          <Slot />
        </main>
        <Footer contact={contact} branding={branding.value} />
      </div>
    </div>
  );
});
