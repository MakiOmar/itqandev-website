import { component$, Slot } from '@builder.io/qwik';
import { Link, routeAction$, routeLoader$, z, zod$, useLocation } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { useAppRoutes } from '../../../../lib/constants/routes';
import { clearProjectSettingsCache } from '../../../../lib/api/project-settings';
import type { SiteLanguageRow } from '../../../../types/site-language';

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
  site_languages: SiteLanguageRow[];
  default_locale: string;
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
  site_languages: [
    { code: 'en', label: 'English', native_label: 'English', rtl: false },
  ],
  default_locale: 'en',
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
    site_languages: normalizeSiteLanguages((input as any)?.site_languages),
    default_locale: normalizeDefaultLocale((input as any)?.default_locale, (input as any)?.site_languages),
  };
}

function normalizeSiteLanguages(raw: unknown): SiteLanguageRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultSettings.site_languages;
  }
  const rows: SiteLanguageRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const code = String(o.code || '')
      .trim()
      .toLowerCase();
    if (!code) {
      continue;
    }
    rows.push({
      code,
      label: String(o.label || code),
      native_label: String(o.native_label || o.label || code),
      rtl: !!o.rtl,
    });
  }
  return rows.length > 0 ? rows : defaultSettings.site_languages;
}

function normalizeDefaultLocale(raw: unknown, langsRaw: unknown): string {
  const langs = normalizeSiteLanguages(langsRaw);
  const codes = langs.map((l) => l.code);
  const d =
    typeof raw === 'string' && raw.trim()
      ? raw.trim().toLowerCase()
      : defaultSettings.default_locale;
  if (codes.includes(d)) {
    return d;
  }
  return codes[0] || defaultSettings.default_locale;
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
 * Sends only submitted section keys and adds compatibility aliases.
 * Backend preserves existing keys to avoid cross-section overwrites.
 */
export const useUpdateSettings = routeAction$(
  async (data, { cookie, request }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request);
      const apiClient = getApiClient(cookieHeader);
      const has = (key: string) => Object.prototype.hasOwnProperty.call(data, key);
      const payload: Record<string, any> = {};

      const stringKeys = [
        'site_name',
        'site_description',
        'site_email',
        'site_phone',
        'site_address',
        'social_facebook',
        'social_twitter',
        'social_linkedin',
        'social_instagram',
        'logo',
        'logoDark',
        'logoLight',
        'favicon',
        'primaryColor',
        'secondaryColor',
      ];

      for (const key of stringKeys) {
        if (has(key)) {
          payload[key] = String((data as any)[key] ?? '');
        }
      }

      if (has('upload_max_size')) {
        const parsedMaxSize = Number((data as any).upload_max_size);
        if (Number.isFinite(parsedMaxSize) && parsedMaxSize > 0) {
          payload.upload_max_size = parsedMaxSize;
        }
      }

      if ('site_name' in payload) {
        payload.name = payload.site_name;
      }
      if ('site_description' in payload) {
        payload.description = payload.site_description;
      }
      if ('site_email' in payload) {
        payload.supportEmail = payload.site_email;
      }
      if ('site_phone' in payload) {
        payload.supportPhone = payload.site_phone;
      }
      if ('primaryColor' in payload) {
        payload.primary_color = payload.primaryColor;
      }
      if ('secondaryColor' in payload) {
        payload.secondary_color = payload.secondaryColor;
      }
      if ('logo' in payload) {
        payload.site_logo = payload.logo;
      }
      if ('favicon' in payload) {
        payload.site_favicon = payload.favicon;
      }
      if ('logoDark' in payload) {
        payload.logo_dark = payload.logoDark;
        payload.dark_logo = payload.logoDark;
        payload.site_logo_dark = payload.logoDark;
      }
      if ('logoLight' in payload) {
        payload.logo_light = payload.logoLight;
        payload.light_logo = payload.logoLight;
        payload.site_logo_light = payload.logoLight;
      }

      if (has('site_languages_json')) {
        try {
          const parsed = JSON.parse(String((data as any).site_languages_json));
          if (Array.isArray(parsed)) {
            payload.site_languages = parsed;
          }
        } catch {
          /* ignore invalid JSON */
        }
      }

      if (has('default_locale')) {
        const code = String((data as any).default_locale || '')
          .trim()
          .toLowerCase();
        if (code) {
          payload.default_locale = code;
        }
      }

      await apiClient.put(API_ENDPOINTS.SETTINGS.UPDATE, payload);
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
    site_languages_json: z.string().optional(),
    default_locale: z.string().optional(),
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
  const { lang } = useTranslate();
  const action = useUpdateSettings();
  return (
    <button
      type="submit"
      disabled={action.isRunning}
      class="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
    >
      {action.isRunning ? translateApp(lang, 'settings.saving') : translateApp(lang, 'settings.save')}
    </button>
  );
});

/**
 * Settings section layout with WordPress-like sub-menu pages.
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const location = useLocation();

  const tabs = [
    { label: translateApp(lang, 'settings.general'), href: R.value.ADMIN.SETTINGS_GENERAL },
    { label: translateApp(lang, 'settings.socialMedia'), href: R.value.ADMIN.SETTINGS_SOCIAL },
    { label: translateApp(lang, 'media.title'), href: R.value.ADMIN.SETTINGS_MEDIA },
    { label: translateApp(lang, 'settings.branding'), href: R.value.ADMIN.SETTINGS_BRANDING },
    { label: translateApp(lang, 'settings.languagesNav'), href: R.value.ADMIN.SETTINGS_LANGUAGES },
  ];

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{translateApp(lang, 'settings.title')}</h1>
        <p class="text-gray-600 dark:text-gray-400">{translateApp(lang, 'settings.subtitle')}</p>
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
