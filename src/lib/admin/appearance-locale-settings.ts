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

/**
 * Shared repeater: rows are the same in every language; only item fields marked `translatable: true`
 * are translated, stored as `translations.{loc}.{key}.{rowId}.{itemKey}` (backend SharedRepeaterTranslations).
 */
export function isSharedRepeaterField(field: AppearanceSettingField): boolean {
  return (
    field.type === 'repeater' &&
    field.translatable === false &&
    (field.item_fields ?? []).some((f) => f.translatable === true)
  );
}

export function newRepeaterRowId(): string {
  return `itm_${Math.random().toString(36).slice(2, 10)}`;
}

export type SharedRepeaterBag = Record<string, Record<string, string>>;

export function readSharedRepeaterBag(
  settings: Record<string, unknown>,
  key: string,
  locale: string,
  defaultLocale: string,
): SharedRepeaterBag {
  const raw = readAppearanceSettingValue(settings, key, locale, defaultLocale, true);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as SharedRepeaterBag) : {};
}

export function writeSharedRepeaterText(
  settings: Record<string, unknown>,
  key: string,
  rowId: string,
  itemKey: string,
  value: string,
  locale: string,
  defaultLocale: string,
): Record<string, unknown> {
  const bag = readSharedRepeaterBag(settings, key, locale, defaultLocale);
  const row = { ...(bag[rowId] ?? {}), [itemKey]: value };
  return writeAppearanceSettingValue(settings, key, { ...bag, [rowId]: row }, locale, defaultLocale, true);
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
