import { component$, useStore, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { SettingsTranslationsRoot } from '../../../../../components/admin/SettingsFieldTranslations';
import { SeoDefaultsBlockFields } from '../../../../../components/admin/SeoDefaultsBlockFields';
import { secondarySiteLocales } from '../../../../../lib/admin/settings-translations';
import { parseSeoDefaults, SEO_DEFAULTS_TYPES, type SeoDefaultsType } from '../../../../../lib/seo/seo-defaults';
import { SettingsSaveButton, useSettings, useUpdateSettings } from '../layout';

const TYPE_LABEL_KEYS: Record<SeoDefaultsType, string> = {
  page: 'settings.seoTypePage',
  blog_post: 'settings.seoTypeBlogPost',
  project: 'settings.seoTypeProject',
  service: 'settings.seoTypeService',
};

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();
  const defaults = useStore(parseSeoDefaults(settings.value.seo_defaults));

  const secondaryLocales = secondarySiteLocales(settings.value.site_languages, settings.value.default_locale);

  const successTitle = String(translateApp(lang, 'common.success'));
  const savedText = String(translateApp(lang, 'settings.saveSuccess'));
  const errorTitle = String(translateApp(lang, 'common.error'));
  const errorText = String(translateApp(lang, 'settings.saveFailed'));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const result = track(() => updateAction.value);
    if (!result) return;
    if ((result as any).success) {
      showSuccess(successTitle, { text: (result as any).message || savedText });
    } else if ((result as any).error) {
      showError(errorTitle, { text: (result as any).error || errorText });
    }
  });

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <h2 class="mb-1 text-lg font-semibold">{translateApp(lang, 'settings.seoTitle')}</h2>
      <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{translateApp(lang, 'settings.seoIntro')}</p>

      <Form action={updateAction} class="space-y-6">
        {/* Full seo_defaults object; the API replaces it as a whole */}
        <input type="hidden" name="seo_defaults_json" value={JSON.stringify(defaults)} />

        <SettingsTranslationsRoot
          locales={secondaryLocales}
          initialTranslations={settings.value.settings_translations}
          rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
          fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
        >
          {/* Global defaults: apply to every content type unless overridden below */}
          <section class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 class="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'settings.seoGlobal')}
            </h3>
            <SeoDefaultsBlockFields
              lang={lang}
              idPrefix="seo-defaults-global"
              block={defaults}
              translationPath={['seo_defaults']}
            />
          </section>

          {/* Per content type overrides; empty fields inherit the global defaults */}
          <section class="space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.seoTypes')}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{translateApp(lang, 'settings.seoTypesHint')}</p>
            </div>
            {SEO_DEFAULTS_TYPES.map((type) => (
              <details key={type} class="rounded-lg border border-gray-200 dark:border-gray-700">
                <summary class="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {translateApp(lang, TYPE_LABEL_KEYS[type])}
                </summary>
                <div class="border-t border-gray-200 p-4 dark:border-gray-700">
                  <SeoDefaultsBlockFields
                    lang={lang}
                    idPrefix={`seo-defaults-${type}`}
                    block={defaults.types[type]}
                    translationPath={['seo_defaults', 'types', type]}
                    inheritFrom={defaults}
                  />
                </div>
              </details>
            ))}
          </section>
        </SettingsTranslationsRoot>

        <div class="flex justify-end">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'SEO Settings - Dashboard',
};
