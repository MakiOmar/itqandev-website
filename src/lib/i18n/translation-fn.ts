import { $ } from '@builder.io/qwik';
import type { TranslationFn } from 'qwik-speak';

// Import translation files directly
// These are bundled and available on both server and client
import enTranslations from '../../i18n/en.json';
import arTranslations from '../../i18n/ar.json';

/**
 * Translation data map - wrap in 'app' asset
 * This needs to be available on both server and client
 */
const translations: Record<string, Record<string, any>> = {
  en: { app: enTranslations },
  ar: { app: arTranslations },
};

/**
 * Load translation function for qwik-speak
 * This function loads translation JSON files based on language and asset name
 * Translations are already imported, so this can return synchronously
 * Must be wrapped in $() to create a QRL
 */
const loadTranslation$ = $(async (lang: string, asset: string) => {
  // Get the language data, fallback to English (default) if not found
  const langData = translations[lang] || translations['en'];
  
  if (!langData) {
    console.warn(`[i18n] No translations found for language: ${lang}, asset: ${asset}`);
    return null;
  }
  
  // Merge leaf payload so Speak's translation[lang] matches keys like "common.loading"
  // (getValue walks from the merged root; wrapping as { app: {...} } would require "app.common.loading").
  if (asset && langData[asset]) {
    return langData[asset];
  }
  
  // If no asset specified, return all translations for the language
  return langData;
});

// Export translations map for direct access if needed
export { translations };

/**
 * Translation function configuration for qwik-speak
 */
export const translationFn: TranslationFn = {
  loadTranslation$,
};
