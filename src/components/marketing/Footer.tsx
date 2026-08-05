import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { getConfig } from '~/lib/config';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { Button } from '~/components/marketing/Button';
import { Container } from '~/components/marketing/Container';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import type { FooterPublicPayload, FooterZoneInstance } from '~/lib/marketing/appearance-types';
import { FooterBlockView } from '~/components/marketing/footer-blocks/FooterBlockView';

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
  footer?: FooterPublicPayload | null;
}

function spanClass(span: number): string {
  const s = Math.max(1, Math.min(12, span || 3));
  // Tailwind needs full class names — map common spans used by the builder.
  const map: Record<number, string> = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
    12: 'lg:col-span-12',
  };
  return map[s] ?? 'lg:col-span-3';
}

const BuilderZone = component$<{
  zone: FooterZoneInstance;
  zoneKey: string;
  ctx: {
    uiLocale: string;
    brandName: string;
    year: number;
    branding: FooterProps['branding'];
    contact: FooterProps['contact'];
    homeHref: string;
  };
}>(({ zone, zoneKey, ctx }) => {
  if (!zone.enabled || !zone.columns?.length) {
    return null;
  }
  const isBottom = zoneKey === 'bottom';

  return (
    <div
      class={
        isBottom
          ? 'mt-12 border-t border-slate-200 pt-8 dark:border-slate-700'
          : zoneKey === 'top'
            ? 'mb-10 border-b border-slate-200 pb-10 dark:border-slate-700'
            : ''
      }
    >
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
        {zone.columns.map((col) => (
          <div key={col.id} class={`space-y-6 ${spanClass(col.span)}`}>
            {col.blocks.map((block) => (
              <FooterBlockView key={block.id} block={block} ctx={ctx} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export const Footer = component$<FooterProps>(({ contact, branding, footer }) => {
  const isDarkMode = useSignal(false);
  const config = getConfig();
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const MR = marketingRoutes(uiLocale);
  const year = new Date().getFullYear();
  const brandName = branding?.name || config.branding.name;
  const mode = footer?.mode === 'builder' ? 'builder' : 'hardcoded';

  const defaultLogo = resolveLaravelMediaUrl(branding?.logo || '');
  const lightLogo = resolveLaravelMediaUrl(branding?.logoLight || defaultLogo);
  const darkLogo = resolveLaravelMediaUrl(branding?.logoDark || defaultLogo);
  const activeLogo = isDarkMode.value
    ? darkLogo || lightLogo || defaultLogo
    : lightLogo || darkLogo || defaultLogo;

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

  const blockCtx = {
    uiLocale,
    brandName,
    year,
    branding,
    contact,
    homeHref: MR.home,
  };

  if (mode === 'builder' && footer && footer.mode === 'builder') {
    const zones = footer.zones ?? {};
    return (
      <footer
        class="border-t border-slate-200 bg-slate-50/55 text-slate-900 backdrop-blur-md light:border-slate-200 light:bg-slate-50/55 light:text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:backdrop-blur-none"
        role="contentinfo"
      >
        <Container class="py-12 md:py-16">
          {(['top', 'main', 'bottom'] as const).map((key) => {
            const zone = zones[key];
            if (!zone) return null;
            return <BuilderZone key={key} zoneKey={key} zone={zone} ctx={blockCtx} />;
          })}
        </Container>
      </footer>
    );
  }

  const footerLinks = [
    { label: 'Services', href: MR.services },
    { label: 'Portfolio', href: MR.portfolio },
    { label: 'About', href: MR.about },
    { label: 'Pricing', href: MR.pricing },
    { label: 'Blog', href: MR.blog },
    { label: 'Contact', href: MR.contact },
  ];

  return (
    <footer
      class="border-t border-slate-200 bg-slate-50/55 text-slate-900 backdrop-blur-md light:border-slate-200 light:bg-slate-50/55 light:text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:backdrop-blur-none"
      role="contentinfo"
    >
      <Container class="py-12 md:py-16">
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <MarketingLink
              href={MR.home}
              class="inline-flex items-center gap-2 text-lg font-bold light:text-slate-900 dark:text-white"
            >
              {activeLogo && (
                <img
                  src={activeLogo}
                  alt={brandName}
                  width={120}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  class="h-7 max-w-logo object-contain"
                />
              )}
              <span>{brandName}</span>
            </MarketingLink>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Web, Android & iOS development. We build digital products that scale.
            </p>
          </div>

          <div>
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              Quick links
            </h3>
            <ul class="mt-4 space-y-2" role="list">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <MarketingLink
                    href={item.href}
                    class="text-sm light:text-slate-700 light:hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    {item.label}
                  </MarketingLink>
                </li>
              ))}
            </ul>
          </div>

          {(contact?.email || (contact?.socials && contact.socials.length > 0)) && (
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
                Contact
              </h3>
              <ul class="mt-4 space-y-2" role="list">
                {contact.email && (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      class="text-sm light:text-slate-700 light:hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
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
                      class="text-sm light:text-slate-700 light:hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Button href={MR.contact} variant="primary">
              Get in touch
            </Button>
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
