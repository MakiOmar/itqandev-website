import type { RequestHandler } from '@builder.io/qwik-city';
import { withUiLocale } from '~/lib/i18n/ui-locale-path';

/** Legacy `/work/` → canonical `/portfolio/` (preserve query string). */
export const onGet: RequestHandler = async ({ params, url, redirect }) => {
  const lang = String(params.lang || 'en');
  const target = `${withUiLocale(lang, '/portfolio/')}${url.search}`;
  throw redirect(301, target);
};
