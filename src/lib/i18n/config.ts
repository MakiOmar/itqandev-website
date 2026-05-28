import type { SpeakConfig } from 'qwik-speak';

/** Single source for UI locales: add a row here (+ matching `src/i18n/{lang}.json`). */
export const UI_LOCALE_DEFINITIONS = [
  {
    lang: 'en',
    currency: 'USD',
    timeZone: 'America/Los_Angeles',
    rtl: false,
  },
  {
    lang: 'ar',
    currency: 'USD',
    timeZone: 'Asia/Riyadh',
    rtl: true,
  },
] as const;

/**
 * qwik-speak configuration
 */
export const speakConfig: SpeakConfig = {
  defaultLocale: {
    lang: UI_LOCALE_DEFINITIONS[0].lang,
    currency: UI_LOCALE_DEFINITIONS[0].currency,
    timeZone: UI_LOCALE_DEFINITIONS[0].timeZone,
  },
  supportedLocales: UI_LOCALE_DEFINITIONS.map(({ lang, currency, timeZone }) => ({
    lang,
    currency,
    timeZone,
  })),
  assets: ['app'],
};
