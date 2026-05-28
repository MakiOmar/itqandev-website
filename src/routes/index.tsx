import { component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { uiLangFromPreferredCookie } from '../lib/i18n/ui-locale-path';

/**
 * Bare `/` → preferred or default locale home (`/en/`, `/ar/`, …).
 */
export const onGet: RequestHandler = ({ cookie, url, redirect: redirectFn }) => {
  const lang = uiLangFromPreferredCookie(cookie);
  throw redirectFn(302, `/${lang}/${url.search}`);
};

/** onGet always redirects; this export satisfies the route module shape. */
export default component$(() => null);
