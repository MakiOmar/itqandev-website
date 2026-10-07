import type { SiteLanguageRow } from '../../types/site-language';

/** Query param that opens a visual builder on a specific content locale (e.g. from the public admin drawer). */
export const BUILDER_LOCALE_PARAM = 'locale';

type BuilderLocaleMeta = {
  site_languages?: SiteLanguageRow[];
  default_locale?: string;
  content_editing_locale?: string;
};

/** Site primary locale; translatable builder settings stored for it live on the base keys. */
export function builderPrimaryLocale(meta: BuilderLocaleMeta): string {
  return (meta.default_locale || 'en').toLowerCase();
}

/**
 * Locale a builder opens on: the requested `?locale=` when it is a site language, else the
 * editor's preferred content locale, else the site primary.
 */
export function resolveBuilderInitialLocale(meta: BuilderLocaleMeta, requested?: string | null): string {
  const codes = new Set(
    (meta.site_languages ?? []).map((l) => String(l?.code ?? '').toLowerCase()).filter(Boolean),
  );
  const isSiteLocale = (code: string) => codes.has(code);
  const wanted = (requested ?? '').toLowerCase().trim();
  if (wanted && isSiteLocale(wanted)) return wanted;
  const preferred = (meta.content_editing_locale ?? '').toLowerCase().trim();
  if (preferred && isSiteLocale(preferred)) return preferred;
  return builderPrimaryLocale(meta);
}

/** Appends `?locale=` so the builder opens on the content locale the editor was viewing. */
export function withBuilderLocale(href: string, locale: string | null | undefined): string {
  const code = (locale ?? '').toLowerCase().trim();
  if (!code) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}${BUILDER_LOCALE_PARAM}=${encodeURIComponent(code)}`;
}
