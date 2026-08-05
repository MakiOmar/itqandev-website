import { component$ } from '@builder.io/qwik';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { Button } from '~/components/marketing/Button';
import { ThemeToggle } from '~/components/marketing/ThemeToggle';
import { SiteLanguageSwitcher } from '~/components/common/SiteLanguageSwitcher';
import { UserDropdown } from '~/components/common/UserDropdown';
import { withUiLocale } from '~/lib/i18n/ui-locale-path';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import { isFeatureModuleEnabled, type FeatureModuleKey } from '~/lib/api/project-settings';
import { getFeatureModuleForPublicHref } from '~/lib/admin/feature-module-routes';
import type { PublicNavItem } from '~/lib/marketing/public-menu';
import type { AuthSession } from '~/lib/auth/types';
import type { SiteLanguageRow } from '~/types/site-language';
import { getLocalizedRoutes } from '~/lib/constants/routes';

export type ChromeKitViewProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
  branding?: {
    name: string;
    logo?: string;
    logoDark?: string;
    logoLight?: string;
    site_languages?: SiteLanguageRow[];
  } | null;
  session?: AuthSession | null;
  features?: Partial<Record<FeatureModuleKey, boolean>> & Record<string, boolean>;
  contact?: { email?: string; socials?: { name: string; url: string }[] };
  isDarkMode?: boolean;
};

function asBool(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null) return fallback;
  return v === true || v === 'true' || v === 1 || v === '1';
}

function asItems(settings: Record<string, unknown>): PublicNavItem[] {
  const raw = settings.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        label: String(row.label ?? ''),
        href: String(row.href ?? ''),
        open_in_new_tab: !!row.open_in_new_tab,
        children: Array.isArray(row.children)
          ? (row.children as PublicNavItem[])
          : [],
      };
    })
    .filter((i) => i.label && i.href);
}

function filterNav(
  items: PublicNavItem[],
  features?: ChromeKitViewProps['features'],
): PublicNavItem[] {
  return items.filter((item) => {
    const mod = getFeatureModuleForPublicHref(item.href);
    if (!mod) return true;
    return isFeatureModuleEnabled(features, mod);
  });
}

function localeHref(uiLocale: string, url: string): string {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return withUiLocale(uiLocale, url.startsWith('/') ? url : `/${url}`);
}

/**
 * Renders one header/footer chrome kit leaf.
 */
export const ChromeKitView = component$<ChromeKitViewProps>((props) => {
  const s = props.settings || {};
  const brandName = props.branding?.name || '';
  const defaultLogo = resolveLaravelMediaUrl(props.branding?.logo || '');
  const lightLogo = resolveLaravelMediaUrl(props.branding?.logoLight || defaultLogo);
  const darkLogo = resolveLaravelMediaUrl(props.branding?.logoDark || defaultLogo);
  const activeLogo = props.isDarkMode
    ? darkLogo || lightLogo || defaultLogo
    : lightLogo || darkLogo || defaultLogo;

  switch (props.type) {
    case 'header_brand':
    case 'footer_brand': {
      const showLogo = asBool(s.show_logo, true);
      const showName = asBool(s.show_name, true);
      const tagline = typeof s.tagline === 'string' ? s.tagline : '';
      const home = withUiLocale(props.uiLocale, '/');
      return (
        <div class="flex flex-col gap-2">
          <MarketingLink href={home} class="inline-flex items-center gap-2">
            {showLogo && activeLogo ? (
              <img src={activeLogo} alt={brandName} class="h-8 w-auto" width={120} height={32} />
            ) : null}
            {showName ? (
              <span class="text-lg font-bold text-slate-900 dark:text-white">{brandName}</span>
            ) : null}
          </MarketingLink>
          {props.type === 'footer_brand' && tagline ? (
            <p class="text-sm text-slate-600 dark:text-slate-400">{tagline}</p>
          ) : null}
        </div>
      );
    }
    case 'header_menu':
    case 'footer_menu': {
      const items = filterNav(asItems(s), props.features);
      const title = typeof s.title === 'string' ? s.title.trim() : '';
      const linkClass =
        props.type === 'header_menu'
          ? 'rounded-lg px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          : 'block text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';
      return (
        <div>
          {title ? (
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul
            class={
              props.type === 'header_menu'
                ? 'hidden items-center gap-1 lg:flex'
                : 'space-y-2'
            }
            role="list"
          >
            {items.map((item) => (
              <li key={item.href + item.label}>
                <MarketingLink
                  href={item.href}
                  class={linkClass}
                  {...(item.open_in_new_tab
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {item.label}
                </MarketingLink>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'header_cta':
    case 'footer_cta': {
      const label = String(s.label ?? s.button_label ?? 'Get in touch');
      const url = localeHref(props.uiLocale, String(s.url ?? s.button_url ?? '/contact/'));
      const title = typeof s.title === 'string' ? s.title : '';
      const subtitle = typeof s.subtitle === 'string' ? s.subtitle : '';
      return (
        <div class="space-y-3">
          {title ? (
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          ) : null}
          {subtitle ? <p class="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
          <Button href={url} class="min-w-[8rem]">
            {label}
          </Button>
        </div>
      );
    }
    case 'header_actions': {
      const showTheme = asBool(s.show_theme, true);
      const showLanguage = asBool(s.show_language, true);
      const showAuth = asBool(s.show_auth, true);
      const langs = props.branding?.site_languages ?? [];
      const loginHref = getLocalizedRoutes(props.uiLocale).ADMIN.LOGIN;
      const user = props.session?.user;
      return (
        <div class="flex items-center gap-2">
          {showTheme ? <ThemeToggle /> : null}
          {showLanguage && langs.length > 1 ? (
            <SiteLanguageSwitcher languages={langs} />
          ) : null}
          {showAuth ? (
            user ? (
              <UserDropdown user={user} />
            ) : (
              <Button href={loginHref} variant="outline" class="text-sm">
                Login
              </Button>
            )
          ) : null}
        </div>
      );
    }
    case 'header_spacer':
      return <div class="hidden flex-1 lg:block" aria-hidden="true" />;
    case 'footer_links': {
      const title = typeof s.title === 'string' ? s.title : '';
      const links = Array.isArray(s.links) ? s.links : [];
      return (
        <div>
          {title ? (
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="space-y-2" role="list">
            {links.map((raw) => {
              if (!raw || typeof raw !== 'object') return null;
              const row = raw as Record<string, unknown>;
              const label = String(row.label ?? '');
              const url = localeHref(props.uiLocale, String(row.url ?? ''));
              if (!label || !url) return null;
              return (
                <li key={String(row.id ?? label + url)}>
                  <MarketingLink
                    href={url}
                    class="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {label}
                  </MarketingLink>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    case 'footer_contact': {
      const title = typeof s.title === 'string' ? s.title : '';
      const email =
        (asBool(s.use_site_contact, true) ? props.contact?.email : '') ||
        String(s.email ?? '');
      return (
        <div>
          {title ? (
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          {asBool(s.show_email, true) && email ? (
            <a
              href={`mailto:${email}`}
              class="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {email}
            </a>
          ) : null}
        </div>
      );
    }
    case 'footer_social': {
      const title = typeof s.title === 'string' ? s.title : '';
      const socials = asBool(s.use_site_socials, true) ? props.contact?.socials ?? [] : [];
      return (
        <div>
          {title ? (
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : null}
          <ul class="flex flex-wrap gap-3" role="list">
            {socials.map((soc) => (
              <li key={soc.url}>
                <a
                  href={soc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary-600 hover:underline dark:text-primary-400"
                >
                  {soc.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'footer_rich_text': {
      const title = typeof s.title === 'string' ? s.title : '';
      const body = typeof s.body === 'string' ? s.body : '';
      return (
        <div>
          {title ? (
            <h3 class="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          ) : null}
          {body ? (
            <div
              class="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={body}
            />
          ) : null}
        </div>
      );
    }
    case 'footer_copyright': {
      const text = String(s.text ?? '© {year} {brand}. All rights reserved.')
        .replaceAll('{year}', String(new Date().getFullYear()))
        .replaceAll('{brand}', brandName);
      return <p class="text-sm text-slate-500 dark:text-slate-400">{text}</p>;
    }
    default:
      return null;
  }
});
