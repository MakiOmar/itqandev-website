/**
 * Language → ISO 3166 country code for switcher flags (extend as you add locales).
 * Flags are self-hosted SVGs in `public/flags/{country}.svg`; run `npm run flags:sync`
 * after adding a row (the script reads this map).
 */
const FLAG_COUNTRY_BY_LANG: Record<string, string> = {
  en: 'gb',
  ar: 'sa',
  fr: 'fr',
  de: 'de',
  es: 'es',
  it: 'it',
  pt: 'pt',
  tr: 'tr',
  nl: 'nl',
  pl: 'pl',
  ru: 'ru',
  uk: 'ua',
  he: 'il',
  fa: 'ir',
};

/** Same-origin flag URL for a language code (region suffix ignored), or null when unmapped. */
export function getLanguageFlagSrc(lang: string): string | null {
  const base = String(lang || '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  const country = FLAG_COUNTRY_BY_LANG[base];
  return country ? `/flags/${country}.svg` : null;
}
