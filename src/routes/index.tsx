import { component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { speakConfig } from '../lib/i18n/config';

/**
 * Bare `/` → preferred or default locale home (`/en/`, `/ar/`).
 */
export const onGet: RequestHandler = ({ cookie, url, redirect: redirectFn }) => {
  const pref = cookie.get('preferred-locale')?.value;
  const lang = pref === 'ar' || pref === 'en' ? pref : speakConfig.defaultLocale.lang;
  throw redirectFn(302, `/${lang}/${url.search}`);
};

/** onGet always redirects; this export satisfies the route module shape. */
export default component$(() => null);
