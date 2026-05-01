import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { MediaSelector } from '../../../../components/common/MediaSelector';
import {
  SettingsSaveButton,
  useSettings,
  useUpdateSettings,
} from '../layout';
import type { Media } from '../../../../types';

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();
  const logoUrl = useSignal(settings.value.logo || '');
  const logoDarkUrl = useSignal(settings.value.logoDark || '');
  const logoLightUrl = useSignal(settings.value.logoLight || '');
  const faviconUrl = useSignal(settings.value.favicon || '');
  const showLogoSelector = useSignal(false);
  const showLogoDarkSelector = useSignal(false);
  const showLogoLightSelector = useSignal(false);
  const showFaviconSelector = useSignal(false);

  const successTitle = String(translateApp(lang, 'common.success'));
  const savedText = String(translateApp(lang, 'settings.saveSuccess'));
  const errorTitle = String(translateApp(lang, 'common.error'));
  const errorText = String(translateApp(lang, 'settings.saveFailed'));
  const darkModeLogoLabel = `${String(translateApp(lang, 'settings.logo'))} (${String(translateApp(lang, 'common.darkMode'))})`;
  const lightModeLogoLabel = `${String(translateApp(lang, 'settings.logo'))} (${String(translateApp(lang, 'common.lightMode'))})`;

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

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const current = track(() => settings.value);
    if (!logoUrl.value && current.logo) {
      logoUrl.value = current.logo;
    }
    if (!logoDarkUrl.value && current.logoDark) {
      logoDarkUrl.value = current.logoDark;
    }
    if (!logoLightUrl.value && current.logoLight) {
      logoLightUrl.value = current.logoLight;
    }
    if (!faviconUrl.value && current.favicon) {
      faviconUrl.value = current.favicon;
    }
  });

  return (
    <>
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold">{translateApp(lang, 'settings.branding')}</h2>
        <Form action={updateAction} class="space-y-4">
          <input type="hidden" name="logo" value={logoUrl.value} />
          <input type="hidden" name="logoDark" value={logoDarkUrl.value} />
          <input type="hidden" name="logoLight" value={logoLightUrl.value} />
          <input type="hidden" name="favicon" value={faviconUrl.value} />

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.logo')}
              </label>
              <div class="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                {logoUrl.value ? (
                  <img
                    src={logoUrl.value}
                    alt="Logo preview"
                    width={320}
                    height={80}
                    class="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span class="text-sm text-gray-500 dark:text-gray-400">No logo selected</span>
                )}
              </div>
              <div class="mb-2">
                <input
                  type="text"
                  value={logoUrl.value}
                  readOnly
                  class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick$={() => {
                    showLogoSelector.value = true;
                  }}
                  class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {translateApp(lang, 'media.selectMedia')}
                </button>
                <button
                  type="button"
                  onClick$={() => {
                    logoUrl.value = '';
                  }}
                  class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {translateApp(lang, 'common.delete')}
                </button>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {darkModeLogoLabel}
              </label>
              <div class="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                {logoDarkUrl.value ? (
                  <img
                    src={logoDarkUrl.value}
                    alt="Dark mode logo preview"
                    width={320}
                    height={80}
                    class="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span class="text-sm text-gray-500 dark:text-gray-400">No dark logo selected</span>
                )}
              </div>
              <div class="mb-2">
                <input
                  type="text"
                  value={logoDarkUrl.value}
                  readOnly
                  class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick$={() => {
                    showLogoDarkSelector.value = true;
                  }}
                  class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {translateApp(lang, 'media.selectMedia')}
                </button>
                <button
                  type="button"
                  onClick$={() => {
                    logoDarkUrl.value = '';
                  }}
                  class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {translateApp(lang, 'common.delete')}
                </button>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {lightModeLogoLabel}
              </label>
              <div class="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                {logoLightUrl.value ? (
                  <img
                    src={logoLightUrl.value}
                    alt="Light mode logo preview"
                    width={320}
                    height={80}
                    class="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span class="text-sm text-gray-500 dark:text-gray-400">No light logo selected</span>
                )}
              </div>
              <div class="mb-2">
                <input
                  type="text"
                  value={logoLightUrl.value}
                  readOnly
                  class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick$={() => {
                    showLogoLightSelector.value = true;
                  }}
                  class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {translateApp(lang, 'media.selectMedia')}
                </button>
                <button
                  type="button"
                  onClick$={() => {
                    logoLightUrl.value = '';
                  }}
                  class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {translateApp(lang, 'common.delete')}
                </button>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.favicon')}
              </label>
              <div class="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                {faviconUrl.value ? (
                  <img
                    src={faviconUrl.value}
                    alt="Favicon preview"
                    width={40}
                    height={40}
                    class="h-10 w-10 object-contain"
                  />
                ) : (
                  <span class="text-sm text-gray-500 dark:text-gray-400">No favicon selected</span>
                )}
              </div>
              <div class="mb-2">
                <input
                  type="text"
                  value={faviconUrl.value}
                  readOnly
                  class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick$={() => {
                    showFaviconSelector.value = true;
                  }}
                  class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {translateApp(lang, 'media.selectMedia')}
                </button>
                <button
                  type="button"
                  onClick$={() => {
                    faviconUrl.value = '';
                  }}
                  class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {translateApp(lang, 'common.delete')}
                </button>
              </div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.primaryColor')}
              </label>
              <input
                name="primaryColor"
                type="text"
                placeholder="#0ea5e9"
                value={settings.value.primaryColor}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'settings.secondaryColor')}
              </label>
              <input
                name="secondaryColor"
                type="text"
                placeholder="#334155"
                value={settings.value.secondaryColor}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
          </div>

          <div class="flex justify-end">
            <SettingsSaveButton />
          </div>
        </Form>
      </div>

      {showLogoSelector.value && (
        <MediaSelector
          title={translateApp(lang, 'settings.logo')}
          accept="image/*"
          onSelect={$((media: Media) => {
            logoUrl.value = media.url || media.thumbnailUrl || '';
            showLogoSelector.value = false;
          })}
          onClose={$(() => {
            showLogoSelector.value = false;
          })}
        />
      )}

      {showLogoDarkSelector.value && (
        <MediaSelector
          title={darkModeLogoLabel}
          accept="image/*"
          onSelect={$((media: Media) => {
            logoDarkUrl.value = media.url || media.thumbnailUrl || '';
            showLogoDarkSelector.value = false;
          })}
          onClose={$(() => {
            showLogoDarkSelector.value = false;
          })}
        />
      )}

      {showLogoLightSelector.value && (
        <MediaSelector
          title={lightModeLogoLabel}
          accept="image/*"
          onSelect={$((media: Media) => {
            logoLightUrl.value = media.url || media.thumbnailUrl || '';
            showLogoLightSelector.value = false;
          })}
          onClose={$(() => {
            showLogoLightSelector.value = false;
          })}
        />
      )}

      {showFaviconSelector.value && (
        <MediaSelector
          title={translateApp(lang, 'settings.favicon')}
          accept="image/*"
          onSelect={$((media: Media) => {
            faviconUrl.value = media.url || media.thumbnailUrl || '';
            showFaviconSelector.value = false;
          })}
          onClose={$(() => {
            showFaviconSelector.value = false;
          })}
        />
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Branding Settings - Dashboard',
};
