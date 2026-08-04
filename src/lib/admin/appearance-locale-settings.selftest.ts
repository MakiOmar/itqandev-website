/**
 * Tiny node check for appearance locale writers (run: npx --yes tsx src/lib/admin/appearance-locale-settings.selftest.ts).
 */
import {
  isAppearanceFieldTranslatable,
  writeAppearanceSettingValue,
} from './appearance-locale-settings';
import type { AppearanceSettingField } from '../marketing/appearance-types';

const mediaField: AppearanceSettingField = {
  key: 'image',
  type: 'media',
  label: 'Desktop image',
  translatable: true,
};

if (!isAppearanceFieldTranslatable(mediaField)) {
  throw new Error('expected media field with translatable:true to be translatable');
}

const next = writeAppearanceSettingValue({}, 'image', 42, 'ar', 'en', true);
const bag = (next.translations as Record<string, Record<string, unknown>>)?.ar;
if (bag?.image !== 42) {
  throw new Error(`expected translations.ar.image === 42, got ${JSON.stringify(next)}`);
}

const primary = writeAppearanceSettingValue({}, 'image', 7, 'en', 'en', true);
if (primary.image !== 7 || primary.translations) {
  throw new Error(`expected primary flat image id, got ${JSON.stringify(primary)}`);
}

console.log('appearance-locale-settings.selftest: ok');
