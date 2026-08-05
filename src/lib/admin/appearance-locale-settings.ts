import type { AppearanceSettingField } from '../marketing/appearance-types';

/** Text/textarea/richtext/repeater are translatable unless explicitly marked false. */
export function isAppearanceFieldTranslatable(field: AppearanceSettingField): boolean {
  if (typeof field.translatable === 'boolean') {
    return field.translatable;
  }
  return (
    field.type === 'text' ||
    field.type === 'textarea' ||
    field.type === 'richtext' ||
    field.type === 'repeater'
  );
}

export function readAppearanceSettingValue(
  settings: Record<string, unknown>,
  key: string,
  locale: string,
  defaultLocale: string,
  translatable: boolean,
): unknown {
  const loc = locale.toLowerCase();
  const def = defaultLocale.toLowerCase();
  if (!translatable || loc === def) {
    return settings[key];
  }
  const translations = settings.translations;
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    return '';
  }
  const bag = (translations as Record<string, unknown>)[loc];
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
    return '';
  }
  return (bag as Record<string, unknown>)[key] ?? '';
}

export function writeAppearanceSettingValue(
  settings: Record<string, unknown>,
  key: string,
  value: unknown,
  locale: string,
  defaultLocale: string,
  translatable: boolean,
): Record<string, unknown> {
  const loc = locale.toLowerCase();
  const def = defaultLocale.toLowerCase();
  if (!translatable || loc === def) {
    return { ...settings, [key]: value };
  }
  const prevTranslations =
    settings.translations &&
    typeof settings.translations === 'object' &&
    !Array.isArray(settings.translations)
      ? { ...(settings.translations as Record<string, unknown>) }
      : {};
  const prevBag =
    prevTranslations[loc] &&
    typeof prevTranslations[loc] === 'object' &&
    !Array.isArray(prevTranslations[loc])
      ? { ...(prevTranslations[loc] as Record<string, unknown>) }
      : {};
  return {
    ...settings,
    translations: {
      ...prevTranslations,
      [loc]: {
        ...prevBag,
        [key]: value,
      },
    },
  };
}
