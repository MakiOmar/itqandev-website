import { component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form, routeLoader$ } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { extractFontsList } from '../../../../../lib/admin/font-api';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import type { SiteFont } from '../../../../../types/font';
import { SettingsSaveButton, useSettings, useUpdateSettings } from '../layout';

export const useFontsForTypography = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get<unknown>(`${API_ENDPOINTS.FONTS.LIST}?per_page=100`);
    return extractFontsList(res);
  } catch {
    return [] as SiteFont[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const settings = useSettings();
  const fontsLoader = useFontsForTypography();
  const updateAction = useUpdateSettings();
  const { success: showSuccess, error: showError } = useSwal();

  const fontMode = useSignal<'system' | 'custom'>(settings.value.font_mode === 'custom' ? 'custom' : 'system');
  const fontLtrId = useSignal(settings.value.font_ltr_id != null ? String(settings.value.font_ltr_id) : '');
  const fontRtlId = useSignal(settings.value.font_rtl_id != null ? String(settings.value.font_rtl_id) : '');

  // Keep selects/radios aligned with GET /api/settings (loader revalidation + full reload).
  useTask$(({ track }) => {
    const mode = track(() => settings.value.font_mode);
    const ltr = track(() => settings.value.font_ltr_id);
    const rtl = track(() => settings.value.font_rtl_id);
    fontMode.value = mode === 'custom' ? 'custom' : 'system';
    fontLtrId.value = ltr != null ? String(ltr) : '';
    fontRtlId.value = rtl != null ? String(rtl) : '';
  });

  const successTitle = String(translateApp(lang, 'common.success'));
  const savedText = String(translateApp(lang, 'settings.saveSuccess'));
  const errorTitle = String(translateApp(lang, 'common.error'));
  const errorText = String(translateApp(lang, 'settings.saveFailed'));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const result = track(() => updateAction.value);
    if (!result) return;
    if ((result as { success?: boolean }).success) {
      const saved = result as {
        font_mode?: string;
        font_ltr_id?: number | null;
        font_rtl_id?: number | null;
      };
      if (saved.font_mode) {
        fontMode.value = saved.font_mode === 'custom' ? 'custom' : 'system';
      }
      if ('font_ltr_id' in saved) {
        fontLtrId.value = saved.font_ltr_id != null ? String(saved.font_ltr_id) : '';
      }
      if ('font_rtl_id' in saved) {
        fontRtlId.value = saved.font_rtl_id != null ? String(saved.font_rtl_id) : '';
      }
      showSuccess(successTitle, { text: (result as { message?: string }).message || savedText });
    } else if ((result as { error?: string }).error) {
      showError(errorTitle, { text: (result as { error?: string }).error || errorText });
    }
  });

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {translateApp(lang, 'settings.typographyTitle')}
      </h2>
      <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{translateApp(lang, 'settings.typographySubtitle')}</p>

      <Form action={updateAction} class="space-y-6">
        <fieldset class="space-y-3">
          <legend class="text-sm font-medium text-gray-800 dark:text-gray-100">
            {translateApp(lang, 'settings.fontMode')}
          </legend>
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <input
              type="radio"
              name="font_mode"
              value="system"
              checked={fontMode.value === 'system'}
              onChange$={() => {
                fontMode.value = 'system';
              }}
              class="mt-1"
            />
            <span>
              <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.fontModeSystem')}
              </span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">
                {translateApp(lang, 'settings.fontModeSystemHint')}
              </span>
            </span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <input
              type="radio"
              name="font_mode"
              value="custom"
              checked={fontMode.value === 'custom'}
              onChange$={() => {
                fontMode.value = 'custom';
              }}
              class="mt-1"
            />
            <span>
              <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'settings.fontModeCustom')}
              </span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">
                {translateApp(lang, 'settings.fontModeCustomHint')}
              </span>
            </span>
          </label>
        </fieldset>

        {fontMode.value === 'custom' ? (
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.fontLtr')}
              </label>
              <select
                name="font_ltr_id"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                value={fontLtrId.value}
                onChange$={(e) => {
                  fontLtrId.value = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="">{translateApp(lang, 'settings.fontSelectPlaceholder')}</option>
                {fontsLoader.value.map((font) => (
                  <option
                    key={font.id}
                    value={String(font.id)}
                    selected={fontLtrId.value === String(font.id)}
                  >
                    {`${font.name} (${font.css_family})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.fontRtl')}
              </label>
              <select
                name="font_rtl_id"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                value={fontRtlId.value}
                onChange$={(e) => {
                  fontRtlId.value = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="">{translateApp(lang, 'settings.fontSelectPlaceholder')}</option>
                {fontsLoader.value.map((font) => (
                  <option
                    key={font.id}
                    value={String(font.id)}
                    selected={fontRtlId.value === String(font.id)}
                  >
                    {`${font.name} (${font.css_family})`}
                  </option>
                ))}
              </select>
            </div>
            <p class="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
              <Link href={R.ADMIN.FONTS} class="text-primary-600 hover:underline dark:text-primary-400">
                {translateApp(lang, 'settings.manageFontsLink')}
              </Link>
            </p>
          </div>
        ) : null}

        <div class="flex justify-end">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Typography Settings - Dashboard',
};
