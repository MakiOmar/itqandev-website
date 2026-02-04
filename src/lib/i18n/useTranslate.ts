import { useSpeakLocale, useSpeakContext } from 'qwik-speak';
import { translations } from './translation-fn';

/**
 * Custom translation hook that provides a simpler API
 * Usage: const t = useTranslate(); t('common.loading')
 */
export function useTranslate() {
  const locale = useSpeakLocale();
  const ctx = useSpeakContext();

  /**
   * Translate a key with parameter interpolation
   * @param key - Translation key (e.g., 'common.loading')
   * @param params - Optional parameters for interpolation
   * @returns Translated string
   */
  const translate = (key: string, params?: Record<string, string | number>): string => {
    try {
      // Get the translation data from context
      let translationData = ctx.translation;
      
      // Fallback: if context doesn't have translations, try to get them directly
      if (!translationData || !translationData.app) {
        const langData = translations[locale.lang] || translations['en'];
        if (langData && langData.app) {
          translationData = langData;
        } else {
          console.warn(`[i18n] No translations available for locale: ${locale.lang}, key: ${key}`);
          return key;
        }
      }

      // Navigate through the nested object structure
      const keys = key.split('.');
      let value: any = translationData.app;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          console.warn(`[i18n] Translation key not found: ${key} (locale: ${locale.lang})`);
          return key;
        }
      }

      // If value is not a string, return the key
      if (typeof value !== 'string') {
        console.warn(`[i18n] Translation value is not a string: ${key}`);
        return key;
      }

      // Apply parameter interpolation
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? String(params[paramKey]) : match;
        });
      }

      return value;
    } catch (error) {
      console.error(`[i18n] Error translating key: ${key}`, error);
      return key;
    }
  };

  return {
    /**
     * Translate function
     */
    t: translate,
    /**
     * Current locale
     */
    locale: locale.lang,
  };
}
