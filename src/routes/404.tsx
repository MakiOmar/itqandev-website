import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getLocalizedRoutes } from '../lib/constants/routes';
import { speakConfig } from '../lib/i18n/config';

function uiLangFromPathname(pathname: string): string {
  const m = (pathname || '/').match(/^\/(en|ar)(?=\/|$)/i);
  return m ? m[1].toLowerCase() : speakConfig.defaultLocale.lang;
}

/**
 * 404 Not Found page
 */
export default component$(() => {
  const loc = useLocation();
  const R = getLocalizedRoutes(uiLangFromPathname(loc.url.pathname));

  return (
    <>
      {/* Component: NotFoundPage */}
      <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors duration-300">
        <div class="text-center">
          <h1 class="text-6xl font-bold text-gray-900 dark:text-slate-100 transition-colors">404</h1>
          <h2 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-slate-100 transition-colors">Page Not Found</h2>
          <p class="mt-2 text-gray-600 dark:text-slate-400 transition-colors">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div class="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={R.ADMIN.HOME}
              class="inline-block rounded-lg bg-primary-600 text-white px-6 py-3 text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href={R.PUBLIC.HOME}
              class="inline-block rounded-lg border border-primary-600 text-primary-600 px-6 py-3 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: '404 - Page Not Found',
  meta: [
    {
      name: 'description',
      content: 'The requested page could not be found',
    },
  ],
};
