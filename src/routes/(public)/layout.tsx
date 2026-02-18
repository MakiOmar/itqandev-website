import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getSiteContent } from '~/lib/marketing/content-layer';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { auth } from '~/lib/auth';

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
 * Public marketing layout: Header + main + Footer.
 */
export default component$(() => {
  const siteContent = useSiteContent();
  const authSession = usePublicAuth();
  const contact = siteContent.value?.contact;

  return (
    <div data-public-page class="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300">
      <Header session={authSession.value} />
      <main class="flex-1 overflow-y-auto">
        <Slot />
      </main>
      <Footer contact={contact} />
    </div>
  );
});
