import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';

export interface FooterProps {
  contact?: {
    email?: string;
    socials?: { name: string; url: string }[];
  };
  branding?: {
    name: string;
    logo?: string;
    logoDark?: string;
    logoLight?: string;
  } | null;
}

export const Footer = component$<FooterProps>(({ contact, branding }) => {
  const isDarkMode = useSignal(false);
  const config = getConfig();
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const footerLinks = [
    { label: 'Services', href: MR.services },
    { label: 'Work', href: MR.work },
    { label: 'About', href: MR.about },
    { label: 'Pricing', href: MR.pricing },
    { label: 'Blog', href: MR.blog },
    { label: 'Contact', href: MR.contact },
  ];
  const year = new Date().getFullYear();
  const brandName = branding?.name || config.branding.name;
  const defaultLogo = branding?.logo || '';
  const lightLogo = branding?.logoLight || defaultLogo;
  const darkLogo = branding?.logoDark || defaultLogo;
  const activeLogo = isDarkMode.value
    ? (darkLogo || lightLogo || defaultLogo)
    : (lightLogo || darkLogo || defaultLogo);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      isDarkMode.value = document.documentElement.classList.contains('dark');
    };

    updateTheme();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      cleanup(() => observer.disconnect());
    }
  });

  return (
    <footer class="border-t border-slate-200 bg-slate-50/55 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/50 dark:backdrop-blur-none" role="contentinfo">
      <Container class="py-12 md:py-16">
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href={MR.home} class="inline-flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              {activeLogo && (
                <img
                  src={activeLogo}
                  alt={brandName}
                  width={120}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  class="h-7 w-auto object-contain"
                />
              )}
              <span>{brandName}</span>
            </Link>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Web, Android & iOS development. We build digital products that scale.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Quick links</h3>
            <ul class="mt-4 space-y-2" role="list">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    class="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          {(contact?.email || (contact?.socials && contact.socials.length > 0)) && (
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Contact</h3>
              <ul class="mt-4 space-y-2" role="list">
                {contact.email && (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      class="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.socials?.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div>
            <Link
              href={MR.contact}
              class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
            >
              Get in touch
            </Link>
          </div>
        </div>

        <div class="mt-12 border-t border-slate-200 pt-8 dark:border-slate-700">
          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            &copy; {year} {brandName}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
});
