import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { Button } from '~/components/marketing/Button';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { FooterBlockInstance } from '~/lib/marketing/appearance-types';
import { withUiLocale } from '~/lib/i18n/ui-locale-path';

function str(settings: Record<string, unknown> | undefined, key: string, fallback = ''): string {
  const v = settings?.[key];
  return typeof v === 'string' ? v.trim() : fallback;
}

function bool(settings: Record<string, unknown> | undefined, key: string, fallback: boolean): boolean {
  const v = settings?.[key];
  if (typeof v === 'boolean') return v;
  return fallback;
}

function localizePath(uiLocale: string, url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return withUiLocale(uiLocale, trimmed);
  }
  return trimmed;
}

export type FooterBlockContext = {
  uiLocale: string;
  brandName: string;
  year: number;
  branding?: {
    name: string;
    logo?: string;
    logoDark?: string;
    logoLight?: string;
  } | null;
  contact?: {
    email?: string;
    socials?: { name: string; url: string }[];
  };
  homeHref: string;
};

export const FooterBlockView = component$<{
  block: FooterBlockInstance;
  ctx: FooterBlockContext;
}>(({ block, ctx }) => {
  const settings = block.settings ?? {};
  const isDarkMode = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      isDarkMode.value = document.documentElement.classList.contains('dark');
    };
    updateTheme();
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      cleanup(() => observer.disconnect());
    }
  });

  switch (block.type) {
    case 'brand': {
      const tagline = str(
        settings,
        'tagline',
        'Web, Android & iOS development. We build digital products that scale.',
      );
      const showLogo = bool(settings, 'show_logo', true);
      const showName = bool(settings, 'show_name', true);
      const defaultLogo = resolveLaravelMediaUrl(ctx.branding?.logo || '');
      const lightLogo = resolveLaravelMediaUrl(ctx.branding?.logoLight || defaultLogo);
      const darkLogo = resolveLaravelMediaUrl(ctx.branding?.logoDark || defaultLogo);
      const activeLogo = isDarkMode.value
        ? darkLogo || lightLogo || defaultLogo
        : lightLogo || darkLogo || defaultLogo;

      return (
        <div>
          <MarketingLink
            href={ctx.homeHref}
            class="inline-flex items-center gap-2 text-lg font-bold light:text-slate-900 dark:text-white"
          >
            {showLogo && activeLogo ? (
              <img
                src={activeLogo}
                alt={ctx.brandName}
                width={120}
                height={32}
                loading="lazy"
                decoding="async"
                class="h-7 max-w-logo object-contain"
              />
            ) : null}
            {showName ? <span>{ctx.brandName}</span> : null}
          </MarketingLink>
          {tagline ? (
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{tagline}</p>
          ) : null}
        </div>
      );
    }
    case 'contact': {
      const title = str(settings, 'title', 'Contact');
      const showEmail = bool(settings, 'show_email', true);
      const email = ctx.contact?.email;
      if (!showEmail || !email) {
        return null;
      }
      return (
        <div>
          {title ? (
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="mt-4 space-y-2" role="list">
            <li>
              <a
                href={`mailto:${email}`}
                class="text-sm light:text-slate-700 light:hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {email}
              </a>
            </li>
          </ul>
        </div>
      );
    }
    case 'social': {
      const title = str(settings, 'title', 'Follow us');
      const socials = ctx.contact?.socials ?? [];
      if (socials.length === 0) return null;
      return (
        <div>
          {title ? (
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="mt-4 space-y-2" role="list">
            {socials.map((s) => (
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
      );
    }
    case 'menu': {
      const title = str(settings, 'title', 'Quick links');
      const items = (Array.isArray(settings.items) ? settings.items : []) as PublicNavItem[];
      if (items.length === 0) return null;
      return (
        <div>
          {title ? (
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="mt-4 space-y-2" role="list">
            {items.map((item) => (
              <li key={`${item.href}-${item.label}`}>
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
      );
    }
    case 'links': {
      const title = str(settings, 'title', 'Links');
      const links = Array.isArray(settings.links) ? settings.links : [];
      const normalized = links
        .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
        .map((l) => ({
          id: String(l.id ?? ''),
          label: String(l.label ?? '').trim(),
          url: String(l.url ?? '').trim(),
        }))
        .filter((l) => l.label && l.url);
      if (normalized.length === 0) return null;
      return (
        <div>
          {title ? (
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="mt-4 space-y-2" role="list">
            {normalized.map((item) => (
              <li key={item.id || item.url}>
                <MarketingLink
                  href={localizePath(ctx.uiLocale, item.url)}
                  class="text-sm light:text-slate-700 light:hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {item.label}
                </MarketingLink>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'rich_text': {
      const title = str(settings, 'title');
      let body = str(settings, 'body');
      body = body
        .replaceAll('{year}', String(ctx.year))
        .replaceAll('{brand}', ctx.brandName);
      if (!title && !body) return null;
      return (
        <div>
          {title ? (
            <h3 class="text-sm font-semibold uppercase tracking-wider light:text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          {body ? (
            <p class={`text-sm text-slate-500 dark:text-slate-400 ${title ? 'mt-4' : ''}`}>{body}</p>
          ) : null}
        </div>
      );
    }
    case 'cta': {
      const label = str(settings, 'button_label', 'Get in touch');
      const url = str(settings, 'button_url', '/contact');
      return (
        <div>
          <Button href={localizePath(ctx.uiLocale, url)} variant="primary">
            {label}
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
});
