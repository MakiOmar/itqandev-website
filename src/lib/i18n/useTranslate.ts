import { useSpeakLocale } from 'qwik-speak';
import { translations } from './translation-fn';

/**
 * Custom translation hook that provides a simpler API
 * Usage: const { t } = useTranslate(); t('common.loading')
 *
 * Reads strings from the same bundled JSON as qwik-speak's loadTranslation$.
 * Avoid useSpeakContext() here: the full speak context snapshot can trip Qwik SSR
 * serialization (Code 3) when locale is RTL / non-default.
 */
export function useTranslate() {
  const locale = useSpeakLocale();

  const t = (key: string, params?: Record<string, string | number>): string => {
    try {
      const langKey = locale.lang || 'en';
      const langBundle = translations[langKey] || translations['en'];
      const app = langBundle?.app as Record<string, unknown> | undefined;

      if (!app || typeof app !== 'object') {
        console.warn(`[i18n] No translations available for locale: ${langKey}, key: ${key}`);
        return key;
      }

      const parts = key.split('.');
      let value: unknown = app;

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          console.warn(`[i18n] Translation key not found: ${key} (locale: ${langKey})`);
          return key;
        }
      }

      if (typeof value !== 'string') {
        console.warn(`[i18n] Translation value is not a string: ${key}`);
        return key;
      }

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
    t,
    locale: locale.lang,
  };
}
