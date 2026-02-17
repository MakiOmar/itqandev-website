import { component$, useSignal, $ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { MARKETING_ROUTES } from '~/lib/marketing/constants';
import { ThemeToggle } from '~/components/marketing/ThemeToggle';
import { Button } from '~/components/marketing/Button';
import { Container } from '~/components/marketing/Container';

const navLinks = [
  { label: 'Home', href: MARKETING_ROUTES.home },
  { label: 'Services', href: MARKETING_ROUTES.services },
  { label: 'Work', href: MARKETING_ROUTES.work },
  { label: 'About', href: MARKETING_ROUTES.about },
  { label: 'Pricing', href: MARKETING_ROUTES.pricing },
  { label: 'Blog', href: MARKETING_ROUTES.blog },
  { label: 'Contact', href: MARKETING_ROUTES.contact },
];

export const Header = component$(() => {
  const menuOpen = useSignal(false);
  const config = getConfig();
  const loginHref = config.routes.admin.login;

  const closeMenu = $(() => {
    menuOpen.value = false;
  });

  return (
    <header
      class="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/80"
      role="banner"
    >
      <Container class="flex h-16 items-center justify-between sm:h-18">
        {/* Logo */}
        <Link
          href={MARKETING_ROUTES.home}
          class="text-xl font-bold text-slate-900 dark:text-white"
          aria-label="Home"
        >
          {config.branding.name}
        </Link>

        {/* Desktop nav */}
        <nav class="hidden md:flex md:items-center md:gap-1" aria-label="Main">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: theme + CTA + Login */}
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <div class="hidden sm:flex sm:items-center sm:gap-2">
            <Button href={MARKETING_ROUTES.contact} variant="primary">
              Get in touch
            </Button>
            <Button href={loginHref} variant="outline">
              Login
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen.value}
            onClick$={() => (menuOpen.value = !menuOpen.value)}
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen.value ? (
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {menuOpen.value && (
        <div
          class="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:hidden"
          role="dialog"
          aria-label="Mobile menu"
        >
          <nav class="flex flex-col px-4 py-4" aria-label="Main mobile">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick$={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <div class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <Button href={MARKETING_ROUTES.contact} variant="primary" class="w-full justify-center">
                Get in touch
              </Button>
              <Button href={loginHref} variant="outline" class="w-full justify-center">
                Login
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
});
