import type { SpeakConfig } from 'qwik-speak';

/**
 * qwik-speak configuration
 */
export const speakConfig: SpeakConfig = {
  defaultLocale: {
    lang: 'en', // Default to English as primary language
    currency: 'USD',
    timeZone: 'America/Los_Angeles',
  },
  supportedLocales: [
    { lang: 'en', currency: 'USD', timeZone: 'America/Los_Angeles' },
    { lang: 'ar', currency: 'USD', timeZone: 'Asia/Riyadh' },
  ],
  // Translations will be loaded from src/i18n/{lang}.json
  // Assets are the top-level keys in the JSON files
  assets: ['app'], // Use 'app' as the main asset, containing all translations
};
