import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useLocation } from '@builder.io/qwik-city';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { usePublicShell } from '../layout';

/**
 * Single-segment public unknown paths (e.g. `/en/no-such-page/`).
 * Prefer this over `[...path]` — a catch-all under `(public)` becomes `/[lang]/[...path]`
 * and breaks `/[lang]/admin/…` matching in the Qwik City client/dev router.
 *
 * Multi-segment unknowns still fall through to root `404.tsx` (prod) / Available Routes (dev).
 */
export const usePublicNotFoundStatus = routeLoader$(({ status, params }) => {
  // Never claim reserved top-level segments that belong to sibling route trees.
  const slug = String(params.slug ?? '').toLowerCase();
  if (slug === 'admin') {
    status(404);
    return { reserved: true as const };
  }
  status(404);
  return { reserved: false as const };
});

export default component$(() => {
  const notFound = usePublicNotFoundStatus();
  const loc = useLocation();
  const shell = usePublicShell();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const R = getLocalizedRoutes(uiLocale);
  const themeBody = shell.value.themeBody;

  if (!notFound.value.reserved && themeBody && themeBody.length > 0) {
    return (
      <HomepageSectionsRenderer
        sections={themeBody}
        layoutAware={true}
        allowDefaultSections={false}
        uiLocale={uiLocale}
        branding={shell.value.branding}
      />
    );
  }

  return (
    <div class="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      {/* Fallback when no Theme Builder body is assigned for not_found */}
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
