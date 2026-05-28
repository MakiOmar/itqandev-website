import { speakConfig, UI_LOCALE_DEFINITIONS } from './config';

/** Enabled UI locale codes from qwik-speak (`supportedLocales`). */
export function supportedUiLocaleCodes(): string[] {
  return speakConfig.supportedLocales.map((l) => String(l.lang).toLowerCase());
}

let cachedPrefixRe: RegExp | null = null;

/** Matches leading `/en`, `/ar`, `/fr`, … segment (build-time list from `speakConfig`). */
export function getUiLocalePrefixRegex(): RegExp {
  if (cachedPrefixRe) {
    return cachedPrefixRe;
  }
  const codes = supportedUiLocaleCodes();
  if (codes.length === 0) {
    cachedPrefixRe = /^$/;
    return cachedPrefixRe;
  }
  const alternation = codes
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  cachedPrefixRe = new RegExp(`^/(${alternation})(?=/|$)`, 'i');
  return cachedPrefixRe;
}

export function isSupportedUiLocale(code: string): boolean {
  const c = String(code).toLowerCase();
  return supportedUiLocaleCodes().includes(c);
}

/** RTL UI from `UI_LOCALE_DEFINITIONS` (`rtl: true`), else LTR. */
export function isUiLocaleRtl(lang: string): boolean {
  const code = String(lang).toLowerCase();
  const row = UI_LOCALE_DEFINITIONS.find((l) => l.lang === code);
  return Boolean(row?.rtl);
}

/** Injected into RouterHead inline bootstrap (must stay valid JSON). */
export function uiLocaleBootstrapJson(): string {
  const codes = supportedUiLocaleCodes();
  const rtl: Record<string, boolean> = {};
  for (const code of codes) {
    rtl[code] = isUiLocaleRtl(code);
  }
  return JSON.stringify({
    codes,
    default: speakConfig.defaultLocale.lang,
    rtl,
  });
}
