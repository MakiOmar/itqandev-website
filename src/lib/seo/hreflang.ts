/**
 * `rel="alternate" hreflang` link entries for multilingual public pages.
 * Emits one alternate per enabled site language plus `x-default` (default UI locale).
 */

import { speakConfig } from '~/lib/i18n/config';
import { isSupportedUiLocale } from '~/lib/i18n/ui-locale-segments';
import { swapUiLocaleInPathname } from '~/lib/i18n/ui-locale-path';
import { buildCanonicalHref } from '~/lib/seo/canonical-url';

export type HreflangLink = {
  rel: 'alternate';
  hreflang: string;
  href: string;
};

function normalizeLocaleCodes(codes: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes ?? []) {
    const code = String(raw ?? '')
      .trim()
      .toLowerCase();
    if (!code || !isSupportedUiLocale(code) || seen.has(code)) {
      continue;
    }
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * Build reciprocal hreflang links for the current pathname.
 * `xDefaultLang` defaults to the qwik-speak default locale when not provided.
 */
export function buildHreflangLinks(input: {
  pathname: string;
  pageOrigin?: string;
  siteLanguageCodes: readonly string[];
  /** Locale used for `hreflang="x-default"` (usually the primary / default UI locale). */
  xDefaultLang?: string;
}): HreflangLink[] {
  const codes = normalizeLocaleCodes(input.siteLanguageCodes);
  if (codes.length === 0) {
    return [];
  }

  const xDefaultRaw = String(input.xDefaultLang ?? speakConfig.defaultLocale.lang)
    .trim()
    .toLowerCase();
  const xDefault = codes.includes(xDefaultRaw)
    ? xDefaultRaw
    : codes.includes(speakConfig.defaultLocale.lang)
      ? speakConfig.defaultLocale.lang
      : codes[0];

  const links: HreflangLink[] = codes.map((code) => ({
    rel: 'alternate',
    hreflang: code,
    href: buildCanonicalHref(swapUiLocaleInPathname(input.pathname, code), input.pageOrigin),
  }));

  links.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: buildCanonicalHref(swapUiLocaleInPathname(input.pathname, xDefault), input.pageOrigin),
  });

  return links;
}
