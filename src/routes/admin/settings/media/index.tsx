import { component$, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import {
  SettingsHiddenFields,
  SettingsSaveButton,
  useSettings,
  useUpdateSettings,
} from '../layout';

export default component$(() => {
  const { t } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();

  const successTitle = String(t('common.success'));
  const savedText = String(t('settings.saveSuccess'));
  const errorTitle = String(t('common.error'));
  const errorText = String(t('settings.saveFailed'));

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
      <h2 class="mb-4 text-lg font-semibold">{t('media.title')}</h2>
      <Form action={updateAction} class="space-y-4">
        <SettingsHiddenFields exclude={['upload_max_size']} />

        <div class="max-w-md">
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('settings.uploadMaxSize')}
          </label>
          <input
            name="upload_max_size"
            type="number"
            min="1"
            max="1000"
            value={settings.value.upload_max_size}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>

        <div class="flex justify-end">
          <SettingsSaveButton />
        </div>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Media Settings - Dashboard',
};
