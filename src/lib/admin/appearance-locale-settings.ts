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

function nonEmptyTranslation(value: unknown): boolean {
  return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function overlaySharedRepeaterRows(rows: unknown[], bag: SharedRepeaterBag): unknown[] {
  return rows.map((row) => {
    if (!isPlainObject(row)) return row;
    const translated = bag[String(row.id ?? '')];
    if (!isPlainObject(translated)) return row;
    const next = { ...row };
    for (const [itemKey, value] of Object.entries(translated)) {
      if (nonEmptyTranslation(value)) next[itemKey] = value;
    }
    return next;
  });
}

/**
 * Flattens `settings.translations.{locale}` over the primary values, as the public API does
 * (backend `AppearanceLocalizedSettings::resolveForLocale`): empty translations keep the primary.
 * Saved bags only hold translatable keys, so no field registry is needed; a row-id map over a
 * primary array is a shared repeater bag.
 */
export function resolveAppearanceSettingsForLocale(
  settings: Record<string, unknown>,
  locale: string,
  defaultLocale: string,
): Record<string, unknown> {
  const loc = locale.toLowerCase();
  const { translations, ...flat } = settings;
  if (!loc || loc === defaultLocale.toLowerCase() || !isPlainObject(translations)) return flat;
  const bag = translations[loc];
  if (!isPlainObject(bag)) return flat;
  for (const [key, value] of Object.entries(bag)) {
    if (!nonEmptyTranslation(value)) continue;
    const primary = flat[key];
    flat[key] = Array.isArray(primary) && isPlainObject(value)
      ? overlaySharedRepeaterRows(primary, value as SharedRepeaterBag)
      : value;
  }
  return flat;
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
