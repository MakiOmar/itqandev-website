import { component$, useSignal, useStore, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import {
  SettingsSaveButton,
  useSettings,
  useUpdateSettings,
} from '../layout';
import { LanguageSettingsRow } from '../../../../components/admin/LanguageSettingsRow';
import type { LanguageSettingsRowStrings } from '../../../../components/admin/LanguageSettingsRow';
import { getLocaleOptions } from '../../../../lib/i18n/locale-options';
import type { SiteLanguageRow } from '../../../../types/site-language';

function cloneLanguages(src: SiteLanguageRow[]): SiteLanguageRow[] {
  return src.map((r) => ({ ...r }));
}

export default component$(() => {
  const { t } = useTranslate();
  const settings = useSettings();
  const updateAction = useUpdateSettings();

  const successTitle = String(t('common.success'));
  const savedText = String(t('settings.saveSuccess'));
  const errorTitle = String(t('common.error'));
  const errorText = String(t('settings.saveFailed'));

  const { success: showSuccess, error: showError } = useSwal({
    confirmTitle: String(t('common.confirm')),
    yes: String(t('common.yes')),
    no: String(t('common.no')),
    alertTitle: String(t('common.alert')),
    ok: String(t('common.ok')),
    successTitle,
    errorTitle,
    warningTitle: String(t('common.warning')),
  });

  const initialItems = cloneLanguages(settings.value.site_languages);
  const items = useStore<SiteLanguageRow[]>(initialItems);
  const defaultLocale = useSignal(settings.value.default_locale);
  const langsJson = useSignal(JSON.stringify(initialItems));

  const syncJson = $(() => {
    langsJson.value = JSON.stringify(items);
  });

  const languageRowPrefix = String(t('settings.languageRow'));

  const rowStrings: LanguageSettingsRowStrings = {
    fieldLabel: String(t('settings.languageCode')),
    searchPlaceholder: String(t('settings.searchLanguage')),
    emptyHint: String(t('settings.languageCodeEmpty')),
    noResultsText: String(t('settings.languageNoResults')),
    rtl: String(t('settings.rtl')),
    languageLabel: String(t('settings.languageLabel')),
    languageNative: String(t('settings.languageNative')),
    removeLanguage: String(t('settings.removeLanguage')),
  };

  const removeRowAt = $((index: number) => {
    if (items.length <= 1) {
      return;
    }
    items.splice(index, 1);
    if (!items.some((r) => r.code === defaultLocale.value)) {
      defaultLocale.value = items[0]?.code || 'en';
    }
    syncJson();
  });

  const addLanguageRow = $(() => {
    const used = new Set(items.map((r) => r.code.trim().toLowerCase()).filter(Boolean));
    const opt = getLocaleOptions().find((o) => !used.has(o.code));
    if (opt) {
      items.push({
        code: opt.code,
        label: opt.label,
        native_label: opt.native,
        rtl:
          opt.code.startsWith('ar') || ['he', 'fa', 'ur', 'yi'].includes(opt.code),
      });
    } else {
      items.push({
        code: '',
        label: '',
        native_label: '',
        rtl: false,
      });
    }
    syncJson();
  });

  const onDefaultLocaleChange = $((e: Event) => {
    defaultLocale.value = (e.target as HTMLSelectElement).value;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => updateAction.value);
    const result = updateAction.value;
    if (!result) {
      return;
    }
    if ((result as any).success) {
      showSuccess(successTitle, {
        text: (result as any).message || savedText,
      });
    } else if ((result as any).error) {
      showError(errorTitle, {
        text: (result as any).error || errorText,
      });
    }
  });

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.languagesTitle')}</h2>
      <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{t('settings.languagesSubtitle')}</p>

      <Form action={updateAction} class="space-y-6">
        <input type="hidden" name="site_languages_json" value={langsJson.value} />

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('settings.defaultLocale')}
          </label>
          <select
            name="default_locale"
            value={defaultLocale.value}
            onChange$={onDefaultLocaleChange}
            class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {items.map((row) => (
              <option key={row.code} value={row.code}>
                {`${row.native_label || row.label} (${row.code})`}
              </option>
            ))}
          </select>
        </div>

        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {t('settings.languagesListHeading')}
            </h3>
            <button
              type="button"
              onClick$={addLanguageRow}
              class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              {t('settings.addLanguage')}
            </button>
          </div>

          <div class="space-y-4">
            {items.map((row, index) => (
              <LanguageSettingsRow
                key={`${row.code}-${index}`}
                index={index}
                items={items}
                excludeCodes={items
                  .map((r, j) => (j !== index ? r.code.trim().toLowerCase() : ''))
                  .filter(Boolean)}
                rowTitle={`${languageRowPrefix} ${index + 1}`}
                removeDisabled={items.length <= 1}
                strings={rowStrings}
                syncJson={syncJson}
                onRemove$={removeRowAt}
              />
            ))}
          </div>
        </div>

        <div class="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Languages - Settings',
  meta: [{ name: 'description', content: 'Site languages and default locale' }],
};
