import { component$, Slot } from '@builder.io/qwik';
import { Link, routeAction$, routeLoader$, z, zod$, useLocation } from '@builder.io/qwik-city';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { ROUTES } from '../../../lib/constants/routes';
import { clearProjectSettingsCache } from '../../../lib/api/project-settings';

export interface SettingsFormData {
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
  logo: string;
  logoDark: string;
  logoLight: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
}

export const defaultSettings: SettingsFormData = {
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
  logo: '',
  logoDark: '',
  logoLight: '',
  favicon: '',
  primaryColor: '',
  secondaryColor: '',
};

function normalizeSettings(input: Partial<SettingsFormData> | undefined | null): SettingsFormData {
  const maxUploadSizeRaw =
    Number((input as any)?.upload_max_size) ||
    Number((input as any)?.max_file_size);
  const uploadSizeMb =
    Number((input as any)?.upload_max_size) > 0
      ? Number((input as any)?.upload_max_size)
      : Number((input as any)?.max_file_size) > 0
        ? Math.max(1, Math.round(Number((input as any).max_file_size) / (1024 * 1024)))
        : defaultSettings.upload_max_size;

  return {
    site_name: (input as any)?.site_name || (input as any)?.name || defaultSettings.site_name,
    site_description:
      (input as any)?.site_description || (input as any)?.description || defaultSettings.site_description,
    site_email: (input as any)?.site_email || (input as any)?.supportEmail || defaultSettings.site_email,
    site_phone: (input as any)?.site_phone || (input as any)?.supportPhone || defaultSettings.site_phone,
    site_address: input?.site_address || defaultSettings.site_address,
    social_facebook: input?.social_facebook || defaultSettings.social_facebook,
    social_twitter: input?.social_twitter || defaultSettings.social_twitter,
    social_linkedin: input?.social_linkedin || defaultSettings.social_linkedin,
    social_instagram: input?.social_instagram || defaultSettings.social_instagram,
    upload_max_size: maxUploadSizeRaw > 0 ? uploadSizeMb : defaultSettings.upload_max_size,
    logo: (input as any)?.logo || (input as any)?.site_logo || defaultSettings.logo,
    logoDark:
      (input as any)?.logoDark ||
      (input as any)?.logo_dark ||
      (input as any)?.dark_logo ||
      (input as any)?.site_logo_dark ||
      defaultSettings.logoDark,
    logoLight:
      (input as any)?.logoLight ||
      (input as any)?.logo_light ||
      (input as any)?.light_logo ||
      (input as any)?.site_logo_light ||
      defaultSettings.logoLight,
    favicon: (input as any)?.favicon || (input as any)?.site_favicon || defaultSettings.favicon,
    primaryColor:
      (input as any)?.primaryColor || (input as any)?.primary_color || defaultSettings.primaryColor,
    secondaryColor:
      (input as any)?.secondaryColor || (input as any)?.secondary_color || defaultSettings.secondaryColor,
  };
}

/**
 * Shared settings loader for nested settings pages.
 */
export const useSettings = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.GET);
    const settings = (response?.data ?? response) as Partial<SettingsFormData>;
    return normalizeSettings(settings);
  } catch (error: any) {
    console.warn('Failed to load settings from API, using defaults:', error);
    return defaultSettings;
  }
});

/**
 * Shared settings update action for nested settings pages.
 * Keeps payload keys stable; each child page submits full payload.
 */
export const useUpdateSettings = routeAction$(
  async (data, { cookie, request }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request);
      const apiClient = getApiClient(cookieHeader);

      const parsedMaxSize = Number(data.upload_max_size);
      const siteName = (data.site_name as string) || defaultSettings.site_name;
      const siteDescription = (data.site_description as string) || '';
      const siteEmail = (data.site_email as string) || '';
      const sitePhone = (data.site_phone as string) || '';
      const logo = (data.logo as string) || '';
      const logoDark = (data.logoDark as string) || '';
      const logoLight = (data.logoLight as string) || '';
      const favicon = (data.favicon as string) || '';
      const primaryColor = (data.primaryColor as string) || '';
      const secondaryColor = (data.secondaryColor as string) || '';

      const payload: SettingsFormData = {
        site_name: siteName,
        site_description: siteDescription,
        site_email: siteEmail,
        site_phone: sitePhone,
        site_address: (data.site_address as string) || '',
        social_facebook: (data.social_facebook as string) || '',
        social_twitter: (data.social_twitter as string) || '',
        social_linkedin: (data.social_linkedin as string) || '',
        social_instagram: (data.social_instagram as string) || '',
        upload_max_size:
          Number.isFinite(parsedMaxSize) && parsedMaxSize > 0
            ? parsedMaxSize
            : defaultSettings.upload_max_size,
        logo,
        logoDark,
        logoLight,
        favicon,
        primaryColor,
        secondaryColor,
      };

      // Keep existing keys stable and add compatible aliases used by Laravel settings controller.
      const compatiblePayload = {
        ...payload,
        name: siteName,
        description: siteDescription,
        supportEmail: siteEmail,
        supportPhone: sitePhone,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        site_logo: logo,
        logo_dark: logoDark,
        logo_light: logoLight,
        dark_logo: logoDark,
        light_logo: logoLight,
        site_logo_dark: logoDark,
        site_logo_light: logoLight,
        site_favicon: favicon,
      };

      await apiClient.put(API_ENDPOINTS.SETTINGS.UPDATE, compatiblePayload);
      clearProjectSettingsCache();

      return {
        success: true,
        message: 'Settings saved successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to save settings',
      };
    }
  },
  zod$({
    site_name: z.string().optional(),
    site_description: z.string().optional(),
    site_email: z.string().optional(),
    site_phone: z.string().optional(),
    site_address: z.string().optional(),
    social_facebook: z.string().optional(),
    social_twitter: z.string().optional(),
    social_linkedin: z.string().optional(),
    social_instagram: z.string().optional(),
    upload_max_size: z.union([z.string(), z.number()]).optional(),
    logo: z.string().optional(),
    logoDark: z.string().optional(),
    logoLight: z.string().optional(),
    favicon: z.string().optional(),
    primaryColor: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .optional()
      .or(z.literal('')),
    secondaryColor: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .optional()
      .or(z.literal('')),
  }),
);

interface SettingsHiddenFieldsProps {
  exclude?: Array<keyof SettingsFormData>;
}

export const SettingsHiddenFields = component$<SettingsHiddenFieldsProps>(({ exclude = [] }) => {
  const settings = useSettings();
  const isExcluded = (key: keyof SettingsFormData) => exclude.includes(key);

  return (
    <>
      {!isExcluded('site_name') && <input type="hidden" name="site_name" value={settings.value.site_name} />}
      {!isExcluded('site_description') && (
        <input type="hidden" name="site_description" value={settings.value.site_description} />
      )}
      {!isExcluded('site_email') && <input type="hidden" name="site_email" value={settings.value.site_email} />}
      {!isExcluded('site_phone') && <input type="hidden" name="site_phone" value={settings.value.site_phone} />}
      {!isExcluded('site_address') && (
        <input type="hidden" name="site_address" value={settings.value.site_address} />
      )}
      {!isExcluded('social_facebook') && (
        <input type="hidden" name="social_facebook" value={settings.value.social_facebook} />
      )}
      {!isExcluded('social_twitter') && (
        <input type="hidden" name="social_twitter" value={settings.value.social_twitter} />
      )}
      {!isExcluded('social_linkedin') && (
        <input type="hidden" name="social_linkedin" value={settings.value.social_linkedin} />
      )}
      {!isExcluded('social_instagram') && (
        <input type="hidden" name="social_instagram" value={settings.value.social_instagram} />
      )}
      {!isExcluded('upload_max_size') && (
        <input type="hidden" name="upload_max_size" value={String(settings.value.upload_max_size)} />
      )}
      {!isExcluded('logo') && <input type="hidden" name="logo" value={settings.value.logo} />}
      {!isExcluded('logoDark') && <input type="hidden" name="logoDark" value={settings.value.logoDark} />}
      {!isExcluded('logoLight') && <input type="hidden" name="logoLight" value={settings.value.logoLight} />}
      {!isExcluded('favicon') && <input type="hidden" name="favicon" value={settings.value.favicon} />}
      {!isExcluded('primaryColor') && (
        <input type="hidden" name="primaryColor" value={settings.value.primaryColor} />
      )}
      {!isExcluded('secondaryColor') && (
        <input type="hidden" name="secondaryColor" value={settings.value.secondaryColor} />
      )}
    </>
  );
});

export const SettingsSaveButton = component$(() => {
  const { t } = useTranslate();
  const action = useUpdateSettings();
  return (
    <button
      type="submit"
      disabled={action.isRunning}
      class="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
    >
      {action.isRunning ? t('settings.saving') : t('settings.save')}
    </button>
  );
});

/**
 * Settings section layout with WordPress-like sub-menu pages.
 */
export default component$(() => {
  const { t } = useTranslate();
  const location = useLocation();

  const tabs = [
    { label: t('settings.general'), href: ROUTES.ADMIN.SETTINGS_GENERAL },
    { label: t('settings.socialMedia'), href: ROUTES.ADMIN.SETTINGS_SOCIAL },
    { label: t('media.title'), href: ROUTES.ADMIN.SETTINGS_MEDIA },
    { label: t('settings.branding'), href: ROUTES.ADMIN.SETTINGS_BRANDING },
  ];

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
        <p class="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      <div class="mb-6 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <nav class="flex flex-wrap gap-2" aria-label="Settings sections">
          {tabs.map((tab) => {
            const active = location.url.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                class={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Slot />
    </div>
  );
});
