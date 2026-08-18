import { component$, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form, routeLoader$ } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import {
  SettingsFieldGlobe,
  SettingsTranslationsRoot,
} from '../../../../../components/admin/SettingsFieldTranslations';
import { secondarySiteLocales } from '../../../../../lib/admin/settings-translations';
import {
  SettingsSaveButton,
  useSettings,
  useUpdateSettings,
} from '../layout';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '../../../../../lib/admin/native-select-classes';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';

type HomepagePageOption = { id: number; title: string; slug: string };

export const useHomepagePageOptions = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get(API_ENDPOINTS.PAGES.LIST);
    const body = (response as { data?: unknown })?.data ?? response;
    const rows = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [];
    return (rows as Record<string, unknown>[])
      .map((row) => ({
        id: Number(row.id),
        title: String(row.title ?? ''),
        slug: String(row.slug ?? ''),
      }))
      .filter((row) => Number.isFinite(row.id) && row.id > 0);
  } catch {
    return [] as HomepagePageOption[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();
  const pageOptions = useHomepagePageOptions();

  const secondaryLocales = secondarySiteLocales(
    settings.value.site_languages,
    settings.value.default_locale,
  );

  const successTitle = String(translateApp(lang, 'common.success'));
  const savedText = String(translateApp(lang, 'settings.saveSuccess'));
  const errorTitle = String(translateApp(lang, 'common.error'));
  const errorText = String(translateApp(lang, 'settings.saveFailed'));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const result = track(() => updateAction.value);
    if (!result) return;
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
      <h2 class="mb-4 text-lg font-semibold">{translateApp(lang, 'settings.general')}</h2>
      <Form action={updateAction} class="space-y-4">
        <SettingsTranslationsRoot
          locales={secondaryLocales}
          initialTranslations={settings.value.settings_translations}
          rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
          fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
        >
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.siteName')}
              </label>
              <SettingsFieldGlobe
                field="site_name"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeTitle')}
                fallbackText={settings.value.site_name}
              >
                <input
                  name="site_name"
                  type="text"
                  value={settings.value.site_name}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </SettingsFieldGlobe>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.siteEmail')}
              </label>
              <input
                name="site_email"
                type="email"
                value={settings.value.site_email}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.sitePhone')}
              </label>
              <input
                name="site_phone"
                type="tel"
                value={settings.value.site_phone}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.siteAddress')}
              </label>
              <SettingsFieldGlobe
                field="site_address"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeTitle')}
                fallbackText={settings.value.site_address}
              >
                <input
                  name="site_address"
                  type="text"
                  value={settings.value.site_address}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </SettingsFieldGlobe>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'settings.siteDescription')}
            </label>
            <SettingsFieldGlobe
              field="site_description"
              multiline
              globeAriaLabel={translateApp(lang, 'contentTranslations.globeTitle')}
              fallbackText={settings.value.site_description}
            >
              <textarea
                name="site_description"
                rows={3}
                value={settings.value.site_description}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </SettingsFieldGlobe>
          </div>
        </SettingsTranslationsRoot>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 class="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(lang, 'settings.homepageDisplays')}
          </h3>
          <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {translateApp(lang, 'settings.homepageDisplaysHint')}
          </p>
          <fieldset class="space-y-3">
            <legend class="sr-only">{translateApp(lang, 'settings.homepageDisplays')}</legend>
            <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
              <input
                type="radio"
                name="show_on_front"
                value="builder"
                checked={settings.value.show_on_front !== 'page'}
                class={ADMIN_CHECKBOX_CLASS}
              />
              <span>{translateApp(lang, 'settings.homepageAppearance')}</span>
            </label>
            <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
              <input
                type="radio"
                name="show_on_front"
                value="page"
                checked={settings.value.show_on_front === 'page'}
                class={ADMIN_CHECKBOX_CLASS}
              />
              <span>{translateApp(lang, 'settings.homepageStaticPage')}</span>
            </label>
            <div class="ps-6">
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" for="page_on_front">
                {translateApp(lang, 'settings.homepagePage')}
              </label>
              <select
                id="page_on_front"
                name="page_on_front"
                class={ADMIN_NATIVE_SELECT_CLASS}
                value={settings.value.page_on_front ? String(settings.value.page_on_front) : ''}
              >
                <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
                  {translateApp(lang, 'settings.homepagePageSelect')}
                </option>
                {pageOptions.value.map((page) => (
                  <option key={page.id} class={ADMIN_NATIVE_OPTION_CLASS} value={String(page.id)}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        </div>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <input type="hidden" name="search_engine_indexing" value="0" />
          <label class={ADMIN_CHECKBOX_LABEL_CLASS} for="search_engine_indexing">
            <input
              id="search_engine_indexing"
              name="search_engine_indexing"
              type="checkbox"
              value="1"
              checked={settings.value.search_engine_indexing}
              class={ADMIN_CHECKBOX_CLASS}
            />
            <span>{translateApp(lang, 'settings.searchEngineIndexing')}</span>
          </label>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {translateApp(lang, 'settings.searchEngineIndexingHint')}
          </p>
        </div>

        <div class="flex justify-end">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'General Settings - Dashboard',
};
