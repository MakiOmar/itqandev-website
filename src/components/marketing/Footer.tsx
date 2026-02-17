import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { MARKETING_ROUTES } from '~/lib/marketing/constants';
import { Container } from '~/components/marketing/Container';

export interface FooterProps {
  contact?: {
    email?: string;
    socials?: { name: string; url: string }[];
  };
}

const footerLinks = [
  { label: 'Services', href: MARKETING_ROUTES.services },
  { label: 'Work', href: MARKETING_ROUTES.work },
  { label: 'About', href: MARKETING_ROUTES.about },
  { label: 'Pricing', href: MARKETING_ROUTES.pricing },
  { label: 'Blog', href: MARKETING_ROUTES.blog },
  { label: 'Contact', href: MARKETING_ROUTES.contact },
];

export const Footer = component$<FooterProps>(({ contact }) => {
  const config = getConfig();
  const year = new Date().getFullYear();

  return (
    <footer class="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50" role="contentinfo">
      <Container class="py-12 md:py-16">
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href={MARKETING_ROUTES.home} class="text-lg font-bold text-slate-900 dark:text-white">
              {config.branding.name}
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
              href={MARKETING_ROUTES.contact}
              class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
            >
              Get in touch
            </Link>
          </div>
        </div>

        <div class="mt-12 border-t border-slate-200 pt-8 dark:border-slate-700">
          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            &copy; {year} {config.branding.name}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
});
