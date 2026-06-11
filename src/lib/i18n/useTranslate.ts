import { useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { uiLangFromUrlPathname } from './ui-locale-path';

export { translateApp } from './translate-app';

/**
 * Current UI locale only — no translator function (avoids Qwik SSR Code(3) serialization).
 * Prefer the `/en` / `/ar` URL prefix so client-side language switches re-render labels.
 * Use: import { translateApp } from this module; translateApp(lang, 'common.loading')
 */
export function useTranslate() {
  const locale = useSpeakLocale();
  const loc = useLocation();
  const lang = uiLangFromUrlPathname(loc.url.pathname) || locale.lang || 'en';

  return {
    lang,
    locale: lang,
  };
}
