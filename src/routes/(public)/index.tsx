import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { getConfig } from '../../lib/config';

/**
 * Public homepage
 */
export default component$(() => {
  const config = getConfig();

  return (
    <>
      {/* Component: PublicHomePage */}
      <div class="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
        <h1 class="mb-6 text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
          Welcome to {config.branding.name}
        </h1>
        <p class="mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
          A modern, elegant dashboard built with Qwik and Laravel.
        </p>
        <div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href={config.routes.public.login}
            class="rounded-lg bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href={config.routes.admin.home}
            class="rounded-lg border border-primary-600 px-6 py-3 text-base font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: `Welcome - ${getConfig().branding.name}`,
  meta: [
    {
      name: 'description',
      content: `Welcome to ${getConfig().branding.name}`,
    },
  ],
};
