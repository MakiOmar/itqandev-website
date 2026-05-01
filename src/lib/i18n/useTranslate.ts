import { useSpeakLocale } from 'qwik-speak';

export { translateApp } from './translate-app';

/**
 * Current UI locale only — no translator function (avoids Qwik SSR Code(3) serialization).
 * Use: import { translateApp } from this module; translateApp(lang, 'common.loading')
 */
export function useTranslate() {
  const locale = useSpeakLocale();
  const lang = locale.lang || 'en';

  return {
    lang,
    locale: locale.lang,
  };
}
