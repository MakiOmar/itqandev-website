import { component$, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import {
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
  const locked = settings.value.features_projects_env_locked;

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
      <h2 class="mb-2 text-lg font-semibold">{t('settings.featuresTitle')}</h2>
      <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{t('settings.featuresSubtitle')}</p>

      <Form action={updateAction} class="space-y-6">
        <div class="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <p class="mb-3 text-sm font-medium text-gray-800 dark:text-gray-100">
            {t('settings.featureProjectsLabel')}
          </p>
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('settings.featureProjectsHelp')}</p>

          {locked ? (
            <div class="space-y-2">
              <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('settings.featureProjectsEnvLocked')}
              </p>
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {settings.value.feature_projects
                  ? t('settings.featureProjectsStateOn')
                  : t('settings.featureProjectsStateOff')}
              </p>
            </div>
          ) : (
            <fieldset class="space-y-3">
              <legend class="sr-only">{t('settings.featureProjectsLabel')}</legend>
              <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input
                  type="radio"
                  name="feature_projects"
                  value="true"
                  checked={settings.value.feature_projects}
                  class="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{t('settings.featureProjectsOn')}</span>
              </label>
              <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input
                  type="radio"
                  name="feature_projects"
                  value="false"
                  checked={!settings.value.feature_projects}
                  class="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{t('settings.featureProjectsOff')}</span>
              </label>
            </fieldset>
          )}
        </div>

        {!locked && (
          <div class="flex justify-end">
            <SettingsSaveButton />
          </div>
        )}
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Feature Settings - Dashboard',
};
