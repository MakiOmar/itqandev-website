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
import type { SiteLanguageRow } from '../../../../types/site-language';

function cloneLanguages(src: SiteLanguageRow[]): SiteLanguageRow[] {
  return src.map((r) => ({ ...r }));
}

export default component$(() => {
  const { t } = useTranslate();
  const settings = useSettings();
  const updateAction = useUpdateSettings();
  const { success: showSuccess, error: showError } = useSwal();

  const initialItems = cloneLanguages(settings.value.site_languages);
  const items = useStore<SiteLanguageRow[]>(initialItems);
  const defaultLocale = useSignal(settings.value.default_locale);
  const langsJson = useSignal(JSON.stringify(initialItems));

  const successTitle = String(t('common.success'));
  const savedText = String(t('settings.saveSuccess'));
  const errorTitle = String(t('common.error'));
  const errorText = String(t('settings.saveFailed'));

  const syncJson = $(() => {
    langsJson.value = JSON.stringify(items);
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
            onChange$={(e: Event) => {
              defaultLocale.value = (e.target as HTMLSelectElement).value;
            }}
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
              onClick$={() => {
                items.push({
                  code: 'ar',
                  label: '',
                  native_label: '',
                  rtl: true,
                });
                syncJson();
              }}
              class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              {t('settings.addLanguage')}
            </button>
          </div>

          <div class="space-y-4">
            {items.map((row, index) => (
              <div
                key={`${row.code}-${index}`}
                class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                dir={row.rtl ? 'rtl' : 'ltr'}
              >
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.languageRow')} {index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick$={() => {
                      if (items.length <= 1) {
                        return;
                      }
                      items.splice(index, 1);
                      if (!items.some((r) => r.code === defaultLocale.value)) {
                        defaultLocale.value = items[0]?.code || 'en';
                      }
                      syncJson();
                    }}
                    class="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    {t('settings.removeLanguage')}
                  </button>
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t('settings.languageCode')}
                    </label>
                    <input
                      type="text"
                      value={row.code}
                      placeholder="en"
                      onInput$={(e: Event) => {
                        const v = (e.target as HTMLInputElement).value
                          .trim()
                          .toLowerCase();
                        items[index].code = v;
                        syncJson();
                      }}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div class="flex items-end gap-2 pb-1">
                    <input
                      id={`rtl-${index}`}
                      type="checkbox"
                      checked={row.rtl}
                      onChange$={(e: Event) => {
                        items[index].rtl = (e.target as HTMLInputElement).checked;
                        syncJson();
                      }}
                      class="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <label for={`rtl-${index}`} class="text-sm text-gray-700 dark:text-gray-200">
                      {t('settings.rtl')}
                    </label>
                  </div>
                  <div class="md:col-span-2">
                    <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t('settings.languageLabel')}
                    </label>
                    <input
                      type="text"
                      value={row.label}
                      onInput$={(e: Event) => {
                        items[index].label = (e.target as HTMLInputElement).value;
                        syncJson();
                      }}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div class="md:col-span-2">
                    <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t('settings.languageNative')}
                    </label>
                    <input
                      type="text"
                      value={row.native_label}
                      onInput$={(e: Event) => {
                        items[index].native_label = (e.target as HTMLInputElement).value;
                        syncJson();
                      }}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
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
