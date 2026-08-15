import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useLocation } from '@builder.io/qwik-city';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { getLocalizedRoutes } from '../lib/constants/routes';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '../lib/i18n/ui-locale-path';
import { fetchPublicShell } from '../lib/marketing/public-shell';
import { LayoutDeviceProvider } from '~/lib/marketing/layout-device-context';
import { detectLayoutBreakpointFromUserAgent } from '~/lib/marketing/device-visibility';

/**
 * Production static 404.html fallback. In `npm run dev` / preview, Qwik City
 * skips this file and shows its route list for unmatched multi-segment paths.
 * Single-segment public unknowns use `[lang]/(public)/[slug]` (Theme Builder
 * `not_found` chrome + body). Avoid `[...path]` under `(public)` — it breaks
 * `/[lang]/admin/…` route matching.
 */
export const useNotFoundShell = routeLoader$(async ({ request, params, cookie }) => {
  const cookieHeader = request.headers.get('cookie') || cookie.toString() || '';
  const uiLocale = uiLocaleFromPublicRoute(cookieHeader, params.lang, request.url);
  const device = detectLayoutBreakpointFromUserAgent(request.headers.get('user-agent'));
  const shell = await fetchPublicShell(uiLocale, {
    forwardDocumentUrl: request.url,
    themeContext: 'not_found',
  });
  return { shell, device, uiLocale };
});

export default component$(() => {
  const loc = useLocation();
  const data = useNotFoundShell();
  const R = getLocalizedRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const { shell, device, uiLocale } = data.value;
  const themeBody = shell.themeBody;

  return (
    <LayoutDeviceProvider device={device}>
      <div
        data-public-page
        class="relative isolate min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300"
      >
        <Header
          session={null}
          branding={shell.branding}
          navItems={shell.primaryMenu}
          features={shell.branding.features}
          headerSections={shell.header.sections}
        />
        <main class="flex-1">
          {themeBody && themeBody.length > 0 ? (
            <HomepageSectionsRenderer
              sections={themeBody}
              layoutAware={true}
              allowDefaultSections={false}
              uiLocale={uiLocale}
              branding={shell.branding}
            />
          ) : (
            <div class="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
              <div class="text-center">
                <h1 class="text-6xl font-bold text-gray-900 dark:text-slate-100">404</h1>
                <h2 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                  Page Not Found
                </h2>
                <p class="mt-2 text-gray-600 dark:text-slate-400">
                  The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div class="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={R.PUBLIC.HOME}
                    class="inline-block rounded-lg bg-primary-600 text-white px-6 py-3 text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Go to Home
                  </Link>
                  <Link
                    href={R.ADMIN.HOME}
                    class="inline-block rounded-lg border border-primary-600 text-primary-600 px-6 py-3 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer footer={shell.footer} branding={shell.branding} contact={shell.siteContent?.contact} />
      </div>
    </LayoutDeviceProvider>
  );
});

export const head: DocumentHead = {
  title: '404 - Page Not Found',
  meta: [
    {
      name: 'description',
      content: 'The requested page could not be found',
    },
    {
      name: 'robots',
      content: 'noindex, follow',
    },
  ],
};
