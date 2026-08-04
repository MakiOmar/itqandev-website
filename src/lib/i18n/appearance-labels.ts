import { translateApp } from '../i18n/translate-app';

/** Translate homepage section type labels from the API registry. */
export function appearanceSectionLabel(lang: string | undefined, type: string, fallback?: string): string {
  const key = `appearance.sectionTypes.${type}`;
  const translated = translateApp(lang, key);
  if (translated !== key) {
    return translated;
  }
  return fallback || type;
}

/** Translate appearance settings field labels by registry field key. */
export function appearanceFieldLabel(lang: string | undefined, key: string, fallback?: string): string {
  const i18nKey = `appearance.fields.${key}`;
  const translated = translateApp(lang, i18nKey);
  if (translated !== i18nKey) {
    return translated;
  }
  return fallback || key;
}

export function appearanceZoneLabel(lang: string | undefined, zone: string): string {
  const map: Record<string, string> = {
    top: 'appearance.zoneTop',
    main: 'appearance.zoneMain',
    bottom: 'appearance.zoneBottom',
  };
  const i18nKey = map[zone];
  if (!i18nKey) return zone;
  return translateApp(lang, i18nKey);
}
