import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z } from '@builder.io/qwik-city';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';

/**
 * Settings interface - Matching Vue Dashboard
 */
interface Settings {
  site_name: string;
  site_description: string;
  site_email: string;
  site_phone: string;
  site_address: string;
  social_facebook: string;
  social_twitter: string;
  social_linkedin: string;
  social_instagram: string;
  upload_max_size: number;
}

/**
 * Default settings fallback
 */
const defaultSettings: Settings = {
  site_name: 'CredoCode',
  site_description: '',
  site_email: '',
  site_phone: '',
  site_address: '',
  social_facebook: '',
  social_twitter: '',
  social_linkedin: '',
  social_instagram: '',
  upload_max_size: 100,
};

/**
 * Settings route loader
 */
export const useSettings = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.GET);
    const settings = (response?.data ?? response) as Settings;
    
    // Ensure all required fields exist
    return {
      site_name: settings?.site_name || defaultSettings.site_name,
      site_description: settings?.site_description || defaultSettings.site_description,
      site_email: settings?.site_email || defaultSettings.site_email,
      site_phone: settings?.site_phone || defaultSettings.site_phone,
      site_address: settings?.site_address || defaultSettings.site_address,
      social_facebook: settings?.social_facebook || defaultSettings.social_facebook,
      social_twitter: settings?.social_twitter || defaultSettings.social_twitter,
      social_linkedin: settings?.social_linkedin || defaultSettings.social_linkedin,
      social_instagram: settings?.social_instagram || defaultSettings.social_instagram,
      upload_max_size: settings?.upload_max_size || defaultSettings.upload_max_size,
    };
  } catch (error: any) {
    console.warn('Failed to load settings from API, using defaults:', error);
    // Return default settings if API call fails
    return defaultSettings;
  }
});

/**
 * Update settings route action - Matching Vue Dashboard
 */
export const useUpdateSettings = routeAction$(
  async (data) => {
    try {
      const apiClient = getApiClient();
      
      const payload: Settings = {
        site_name: (data.site_name as string) || 'CredoCode',
        site_description: (data.site_description as string) || '',
        site_email: (data.site_email as string) || '',
        site_phone: (data.site_phone as string) || '',
        site_address: (data.site_address as string) || '',
        social_facebook: (data.social_facebook as string) || '',
        social_twitter: (data.social_twitter as string) || '',
        social_linkedin: (data.social_linkedin as string) || '',
        social_instagram: (data.social_instagram as string) || '',
        upload_max_size: Number(data.upload_max_size) || 100,
      };

      await apiClient.put(API_ENDPOINTS.SETTINGS.UPDATE, payload);

      return {
        success: true,
        message: 'Settings saved successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save settings',
      };
    }
  },
  zod$({
    site_name: z.string().optional(),
    site_description: z.string().optional(),
    site_email: z.string().email().optional().or(z.literal('')),
    site_phone: z.string().optional(),
    site_address: z.string().optional(),
    social_facebook: z.string().url().optional().or(z.literal('')),
    social_twitter: z.string().url().optional().or(z.literal('')),
    social_linkedin: z.string().url().optional().or(z.literal('')),
    social_instagram: z.string().url().optional().or(z.literal('')),
    upload_max_size: z.union([z.string(), z.number()]).optional(),
  }),
);

/**
 * Settings page (Admin only) - Matching Vue Dashboard
 */
export default component$(() => {
  const { t } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const settings = useSettings();
  const updateAction = useUpdateSettings();
  const loading = useSignal(false);

  // Pre-compute translation strings to avoid serialization issues
  const successTitle = String(t('common.success'));
  const savedText = String(t('settings.saveSuccess'));
  const errorTitle = String(t('common.error'));
  const errorText = String(t('settings.saveFailed'));

  // Handle success/error feedback
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => updateAction.value);
    if (updateAction.value) {
      if ((updateAction.value as any).success) {
        showSuccess(successTitle, {
          text: (updateAction.value as any).message || savedText,
        });
      } else if ((updateAction.value as any).failed) {
        showError(errorTitle, {
          text: (updateAction.value as any).error || errorText,
        });
      }
    }
  });

  return (
    <>
      {/* Component: SettingsPage */}
      <div>
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
          <p class="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
        </div>

        <div class="space-y-6">
          {/* General Settings */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold">{t('settings.general')}</h2>
            <Form action={updateAction} class="space-y-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.siteName')}
                  </label>
                  <input
                    name="site_name"
                    type="text"
                    value={settings.value.site_name}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.siteEmail')}
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
                    {t('settings.sitePhone')}
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
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('settings.siteDescription')}
                </label>
                <textarea
                  name="site_description"
                  rows={3}
                  value={settings.value.site_description}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('settings.siteAddress')}
                </label>
                <textarea
                  name="site_address"
                  rows={2}
                  value={settings.value.site_address}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
            </Form>
          </div>

          {/* Social Media Settings */}
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold">{t('settings.socialMedia')}</h2>
            <Form action={updateAction}>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.facebook')}
                  </label>
                  <input
                    name="social_facebook"
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={settings.value.social_facebook}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.twitter')}
                  </label>
                  <input
                    name="social_twitter"
                    type="url"
                    placeholder="https://twitter.com/..."
                    value={settings.value.social_twitter}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.linkedin')}
                  </label>
                  <input
                    name="social_linkedin"
                    type="url"
                    placeholder="https://linkedin.com/..."
                    value={settings.value.social_linkedin}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('settings.instagram')}
                  </label>
                  <input
                    name="social_instagram"
                    type="url"
                    placeholder="https://instagram.com/..."
                    value={settings.value.social_instagram}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </div>
            </Form>
          </div>

          {/* Save Button */}
          <div class="flex justify-end">
            <Form action={updateAction}>
              <button
                type="submit"
                disabled={updateAction.isRunning || loading.value}
                onClick$={async () => {
                  loading.value = true;
                  // The form will handle submission
                  // We'll show success/error after
                }}
                class="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
              >
                {loading.value || updateAction.isRunning ? t('settings.saving') : t('settings.save')}
              </button>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Settings - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage application settings',
    },
  ],
};
