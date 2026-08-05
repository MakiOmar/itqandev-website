/**
 * Map Eastern Arabic-Indic and Extended Arabic-Indic digits to ASCII 0–9.
 * Used for email/tel fields so locales with "Hindi" numerals still submit valid values.
 */
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeWesternDigits(value: string): string {
  if (!value) return value;
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const eastern = ARABIC_INDIC_DIGITS.indexOf(ch);
    if (eastern >= 0) {
      out += String(eastern);
      continue;
    }
    const extended = EXTENDED_ARABIC_INDIC_DIGITS.indexOf(ch);
    if (extended >= 0) {
      out += String(extended);
      continue;
    }
    out += ch;
  }
  return out;
}

/** True when the form field type must stay on Western ASCII digits. */
export function fieldUsesWesternDigits(type: string): boolean {
  return type === 'email' || type === 'tel';
}
