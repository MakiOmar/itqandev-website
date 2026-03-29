/**
 * Flag emojis for language switchers (extend as you add locales).
 */
const FLAG_BY_CODE: Record<string, string> = {
  en: '🇬🇧',
  ar: '🇸🇦',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  pt: '🇵🇹',
  tr: '🇹🇷',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ru: '🇷🇺',
  uk: '🇺🇦',
  he: '🇮🇱',
  fa: '🇮🇷',
};

export function getLanguageFlagEmoji(lang: string): string {
  const base = String(lang || '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  return FLAG_BY_CODE[base] ?? '🌐';
}
