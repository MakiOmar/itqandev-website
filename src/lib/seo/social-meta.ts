/**
 * Site-wide Open Graph / Twitter tags for public pages. Routes set the page-specific values;
 * this only fills what a route left out, so a route value always wins.
 */

export interface HeadMetaEntry {
  name?: string;
  property?: string;
  content?: string;
  key?: string;
}

export interface SiteSocialMetaInput {
  meta: readonly HeadMetaEntry[];
  title: string;
  canonicalHref?: string;
  siteName: string;
  /** URL language of the page (`en`, `ar`, `en-GB`). */
  lang: string;
  /** Every enabled site language; the others become `og:locale:alternate`. */
  siteLanguageCodes: readonly string[];
  facebookAppId?: string;
}

/** Facebook only recognises its own code for some languages (e.g. Arabic is `ar_AR`). */
const FACEBOOK_LOCALE_OVERRIDES: Record<string, string> = { ar: 'ar_AR' };

/** `en` → `en_US`, `en-GB` → `en_GB`; '' when no region can be derived. */
export function toOgLocale(code: string): string {
  const normalized = code.trim().replace('_', '-');
  if (!normalized) return '';
  const override = FACEBOOK_LOCALE_OVERRIDES[normalized.toLowerCase()];
  if (override) return override;
  try {
    const locale = new Intl.Locale(normalized).maximize();
    return locale.region ? `${locale.language}_${locale.region}` : '';
  } catch {
    return '';
  }
}

export function siteSocialMetaAdditions(input: SiteSocialMetaInput): HeadMetaEntry[] {
  const contentOf = (key: string): string =>
    (input.meta.find((m) => m.property === key || m.name === key)?.content ?? '').trim();
  const additions: HeadMetaEntry[] = [];
  const addProperty = (property: string, content: string) => {
    if (content && !contentOf(property)) additions.push({ property, content });
  };
  const addName = (name: string, content: string) => {
    if (content && !contentOf(name)) additions.push({ name, content });
  };

  const ogTitle = contentOf('og:title') || input.title.trim();
  const ogDescription = contentOf('og:description') || contentOf('description');
  const ogImage = contentOf('og:image');

  addProperty('og:type', 'website');
  addProperty('og:site_name', input.siteName.trim());
  addProperty('og:title', ogTitle);
  addProperty('og:description', ogDescription);
  addProperty('og:url', input.canonicalHref?.trim() ?? '');

  const locale = toOgLocale(input.lang);
  addProperty('og:locale', locale);
  if (locale && !contentOf('og:locale:alternate')) {
    const alternates = new Set(input.siteLanguageCodes.map(toOgLocale).filter((l) => l && l !== locale));
    alternates.forEach((alt) => additions.push({ property: 'og:locale:alternate', content: alt }));
  }

  if (ogImage) addProperty('og:image:alt', ogTitle);
  addProperty('fb:app_id', input.facebookAppId?.trim() ?? '');

  addName('twitter:title', ogTitle);
  addName('twitter:description', ogDescription);
  addName('twitter:image', ogImage);
  if (ogImage) addName('twitter:image:alt', ogTitle);

  return additions;
}
