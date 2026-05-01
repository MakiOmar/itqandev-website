import { translations } from './translation-fn';

function normalizeLang(lang: string | undefined): string {
  if (lang == null || typeof lang !== 'string' || lang.trim() === '') return 'en';
  return lang.split('-')[0]!.toLowerCase();
}

/**
 * SSR-safe UI translations from bundled JSON (same source as loadTranslation$).
 * Call as translateApp(lang, 'common.loading') — do not return a translator function from hooks.
 */
export function translateApp(
  lang: string | undefined,
  key: string,
  params?: Record<string, string | number>,
): string {
  try {
    const code = normalizeLang(lang);
    const root = translations[code]?.app ?? translations.en?.app;
    if (!root || typeof root !== 'object') {
      console.warn(`[i18n] No translations for locale: ${code}, key: ${key}`);
      return key;
    }

    const parts = key.split('.');
    let value: unknown = root as Record<string, unknown>;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        console.warn(`[i18n] Key not found: ${key} (locale: ${code})`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`[i18n] Value is not a string: ${key}`);
      return key;
    }

    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }

    return value;
  } catch (e) {
    console.error(`[i18n] translateApp error for ${key}`, e);
    return key;
  }
}
