import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { speakConfig } from '../../lib/i18n/config';
import { isUiLocaleRtl } from '../../lib/i18n/ui-locale-segments';
import { UI_LOCALE_SEGMENTS, stripUiLocaleFromPathname, withUiLocale } from '../../lib/i18n/ui-locale-path';
import { detectLayoutBreakpointFromUserAgent } from '../../lib/marketing/device-visibility';
import { LayoutDeviceProvider } from '../../lib/marketing/layout-device-context';

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

/** UA → mobile|tablet|desktop for Advanced responsive visibility (SSR omit, not CSS). */
export const useLangLayoutDevice = routeLoader$(({ request }) => {
  return detectLayoutBreakpointFromUserAgent(request.headers.get('user-agent'));
});

export default component$(() => {
  const layoutDevice = useLangLayoutDevice();
  return (
    <LayoutDeviceProvider device={layoutDevice.value}>
      <Slot />
    </LayoutDeviceProvider>
  );
});
