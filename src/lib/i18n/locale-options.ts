/**
 * Searchable locale list for admin language settings (BCP-47 style, lowercase).
 * Primary languages from ISO 639-1; plus common regional variants.
 */

export interface LocaleOption {
  code: string;
  label: string;
  native: string;
}

/** Space-separated ISO 639-1 alpha-2 codes (modern assignments). */
const ISO_639_1_CODES = `
aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu
`
  .trim()
  .split(/\s+/)
  .filter(Boolean);

/** Well-known regional / script variants (not covered as separate ISO 639-1 rows). */
const EXTRA_LOCALES: LocaleOption[] = [
  { code: 'en-us', label: 'English (United States)', native: 'English (United States)' },
  { code: 'en-gb', label: 'English (United Kingdom)', native: 'English (United Kingdom)' },
  { code: 'en-au', label: 'English (Australia)', native: 'English (Australia)' },
  { code: 'en-ca', label: 'English (Canada)', native: 'English (Canada)' },
  { code: 'pt-br', label: 'Portuguese (Brazil)', native: 'Português (Brasil)' },
  { code: 'pt-pt', label: 'Portuguese (Portugal)', native: 'Português (Portugal)' },
  { code: 'zh-cn', label: 'Chinese (China, Simplified)', native: '中文（简体，中国）' },
  { code: 'zh-tw', label: 'Chinese (Taiwan, Traditional)', native: '中文（繁體，台灣）' },
  { code: 'zh-hk', label: 'Chinese (Hong Kong)', native: '中文（香港）' },
  { code: 'es-mx', label: 'Spanish (Mexico)', native: 'Español (México)' },
  { code: 'es-es', label: 'Spanish (Spain)', native: 'Español (España)' },
  { code: 'fr-ca', label: 'French (Canada)', native: 'Français (Canada)' },
  { code: 'fr-fr', label: 'French (France)', native: 'Français (France)' },
  { code: 'de-de', label: 'German (Germany)', native: 'Deutsch (Deutschland)' },
  { code: 'de-at', label: 'German (Austria)', native: 'Deutsch (Österreich)' },
  { code: 'de-ch', label: 'German (Switzerland)', native: 'Deutsch (Schweiz)' },
  { code: 'ar-sa', label: 'Arabic (Saudi Arabia)', native: 'العربية (السعودية)' },
  { code: 'ar-eg', label: 'Arabic (Egypt)', native: 'العربية (مصر)' },
  { code: 'nl-be', label: 'Dutch (Belgium)', native: 'Nederlands (België)' },
  { code: 'nl-nl', label: 'Dutch (Netherlands)', native: 'Nederlands (Nederland)' },
  { code: 'nb', label: 'Norwegian Bokmål', native: 'Norsk bokmål' },
  { code: 'nn', label: 'Norwegian Nynorsk', native: 'Norsk nynorsk' },
];

function safeLanguageDisplayNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' });
  } catch {
    return null;
  }
}

let cached: LocaleOption[] | null = null;

export function getLocaleOptions(): LocaleOption[] {
  if (cached) {
    return cached;
  }
  const en = new Intl.DisplayNames(['en'], { type: 'language' });
  const map = new Map<string, LocaleOption>();

  for (const raw of ISO_639_1_CODES) {
    const code = raw.toLowerCase();
    const label = en.of(code) || code;
    let native = label;
    const natDn = safeLanguageDisplayNames(code);
    if (natDn) {
      const n = natDn.of(code);
      if (n) {
        native = n;
      }
    }
    map.set(code, { code, label, native });
  }

  for (const extra of EXTRA_LOCALES) {
    const code = extra.code.toLowerCase();
    if (!map.has(code)) {
      map.set(code, { ...extra, code });
    }
  }

  cached = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'en'));
  return cached;
}

export function getLocaleOptionByCode(code: string): LocaleOption | undefined {
  const c = code.trim().toLowerCase();
  if (!c) {
    return undefined;
  }
  return getLocaleOptions().find((o) => o.code === c);
}

/**
 * Filter locales for combobox. Empty query returns the first `max` (alphabetical, excluding codes).
 */
export function filterLocaleOptions(query: string, excludeCodes: string[] = [], max = 80): LocaleOption[] {
  const ex = new Set(excludeCodes.map((x) => x.trim().toLowerCase()).filter(Boolean));
  const all = getLocaleOptions().filter((o) => !ex.has(o.code));
  const q = query.trim().toLowerCase();
  if (!q) {
    return all.slice(0, max);
  }
  return all
    .filter(
      (o) =>
        o.code.includes(q) ||
        o.label.toLowerCase().includes(q) ||
        o.native.toLowerCase().includes(q),
    )
    .slice(0, max);
}
