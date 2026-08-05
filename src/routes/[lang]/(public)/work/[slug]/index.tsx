import type { RequestHandler } from '@builder.io/qwik-city';
import { withUiLocale } from '~/lib/i18n/ui-locale-path';

/** Legacy `/work/{slug}/` → canonical `/portfolio/{slug}/` (preserve query string). */
export const onGet: RequestHandler = async ({ params, url, redirect }) => {
  const lang = String(params.lang || 'en');
  const slug = String(params.slug || '').trim();
  const path = slug ? `/portfolio/${encodeURIComponent(slug)}/` : '/portfolio/';
  const target = `${withUiLocale(lang, path)}${url.search}`;
  throw redirect(301, target);
};
