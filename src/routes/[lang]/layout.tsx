import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { SiteTypographyHead } from '../../components/perf/SiteTypographyHead';
import { speakConfig } from '../../lib/i18n/config';
import { isUiLocaleRtl } from '../../lib/i18n/ui-locale-segments';
import { UI_LOCALE_SEGMENTS, stripUiLocaleFromPathname, withUiLocale } from '../../lib/i18n/ui-locale-path';

export { useSiteTypography } from '../../lib/loaders/site-typography';

/**
 * URL segment is the source of truth for UI locale (`/en/...`, `/ar/...`).
 * Syncs qwik-speak `locale()` and cookies so SSR API calls match the visible locale.
 */
export const onRequest: RequestHandler = ({ params, locale, url, cookie, redirect: redirectFn }) => {
  const code = String(params.lang ?? '')
    .trim()
    .toLowerCase();
  if (!UI_LOCALE_SEGMENTS.has(code)) {
    const rest = stripUiLocaleFromPathname(url.pathname);
    const fallback = speakConfig.defaultLocale.lang;
    throw redirectFn(302, `${withUiLocale(fallback, rest)}${url.search}`);
  }

  locale(code);

  cookie.set('preferred-locale', code, {
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: [365, 'days'],
  });
  cookie.set('preferred-locale-rtl', isUiLocaleRtl(code) ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: [365, 'days'],
  });
};

export default component$(() => {
  return (
    <>
      <SiteTypographyHead />
      <Slot />
    </>
  );
});
