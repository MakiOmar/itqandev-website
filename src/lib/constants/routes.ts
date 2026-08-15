import { getConfig } from '../config';
import { uiLangFromPreferredCookie, withUiLocale } from '../i18n/ui-locale-path';
import { useTranslate } from '../i18n/useTranslate';

/**
 * All dashboard / auth hrefs include the UI locale prefix (`/en/admin/...`, `/ar/admin/...`).
 */
export function getLocalizedRoutes(lang: string) {
  const config = getConfig();
  const L = (path: string) => withUiLocale(lang, path);
  const p = config.routes.admin.prefix;
  return {
    ADMIN: {
      HOME: L(config.routes.admin.home),
      LOGIN: L(config.routes.admin.login),
      PROFILE: L(`${p}/profile`),
      USERS: L(`${p}/users`),
      SETTINGS: L(`${p}/settings`),
      SETTINGS_GENERAL: L(`${p}/settings/general`),
      SETTINGS_SOCIAL: L(`${p}/settings/social`),
      SETTINGS_MEDIA: L(`${p}/settings/media`),
      SETTINGS_BRANDING: L(`${p}/settings/branding`),
      SETTINGS_LANGUAGES: L(`${p}/settings/languages`),
      SETTINGS_TYPOGRAPHY: L(`${p}/settings/typography`),
      SETTINGS_MARKETING: L(`${p}/settings/marketing`),
      APPEARANCE_HOMEPAGE: L(`${p}/appearance/homepage`),
      APPEARANCE_HEADER: L(`${p}/appearance/header`),
      APPEARANCE_HEADER_NEW: L(`${p}/appearance/header/new`),
      APPEARANCE_FOOTER: L(`${p}/appearance/footer`),
      APPEARANCE_FOOTER_NEW: L(`${p}/appearance/footer/new`),
      APPEARANCE_BODY: L(`${p}/appearance/body`),
      APPEARANCE_BODY_NEW: L(`${p}/appearance/body/new`),
      APPEARANCE_THEME_BUILDER: L(`${p}/appearance/theme-builder`),
      APPEARANCE_THEME_BUILDER_NEW: L(`${p}/appearance/theme-builder/new`),
      APPEARANCE_CHROME_DEFAULTS: L(`${p}/appearance/chrome-defaults`),
      FONTS: L(`${p}/fonts`),
      FONTS_NEW: L(`${p}/fonts/new`),
      ACTIVITY: L(`${p}/activity`),
      NOTIFICATIONS: L(`${p}/notifications`),
      SYSTEM: L(`${p}/system`),
      SYSTEM_BACKUP: L(`${p}/system/backup`),
      TOOLS_SEARCH_REPLACE: L(`${p}/tools/search-replace`),
      PROJECTS: L(`${p}/projects`),
      PROJECTS_NEW: L(`${p}/projects/new`),
      CATEGORIES: L(`${p}/categories`),
      CATEGORIES_NEW: L(`${p}/categories/new`),
      SKILLS: L(`${p}/skills`),
      SKILLS_NEW: L(`${p}/skills/new`),
      SERVICES: L(`${p}/services`),
      SERVICES_NEW: L(`${p}/services/new`),
      TESTIMONIALS: L(`${p}/testimonials`),
      TESTIMONIALS_NEW: L(`${p}/testimonials/new`),
      BLOG: L(`${p}/blog`),
      BLOG_NEW: L(`${p}/blog/new`),
      PAGES: L(`${p}/pages`),
      PAGES_NEW: L(`${p}/pages/new`),
      FORMS: L(`${p}/forms`),
      FORMS_NEW: L(`${p}/forms/new`),
      MEDIA: L(`${p}/media`),
      MENUS: L(`${p}/menus`),
      LOGOUT: L(`${p}/logout`),
    },
    PUBLIC: {
      HOME: L(config.routes.public.home),
      LOGIN: L(config.routes.public.login),
    },
    HOME: L(config.routes.admin.home),
    LOGIN: L(config.routes.admin.login),
    PROFILE: L(`${p}/profile`),
    USERS: L(`${p}/users`),
    SETTINGS: L(`${p}/settings`),
    ACTIVITY: L(`${p}/activity`),
    NOTIFICATIONS: L(`${p}/notifications`),
    SYSTEM: L(`${p}/system`),
  };
}

/** Localized admin “edit” URLs — use these instead of non-serializable `*_EDIT` functions on `ADMIN`. */
export function adminProjectEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/projects/${id}`);
}

export function adminCategoryEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/categories/${id}`);
}

export function adminSkillEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/skills/${id}`);
}

export function adminFontEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/fonts/${id}`);
}

export function adminServiceEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/services/${id}`);
}

export function adminTestimonialEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/testimonials/${id}`);
}

export function adminBlogEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/blog/${id}`);
}

export function adminPageEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/pages/${id}`);
}

export function adminPageBuilderHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/pages/${id}/builder`);
}

export function adminFormEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/forms/${id}`);
}

export function adminFormBuilderHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/forms/${id}/builder`);
}

export function adminFormSubmissionsHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/forms/${id}/submissions`);
}

export function adminHeaderEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/header/${id}`);
}

export function adminHeaderBuilderHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/header/${id}/builder`);
}

export function adminFooterEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/footer/${id}`);
}

export function adminFooterBuilderHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/footer/${id}/builder`);
}

export function adminBodyEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/body/${id}`);
}

export function adminBodyBuilderHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/body/${id}/builder`);
}

export function adminThemeTemplateEditHref(lang: string, id: string | number): string {
  const config = getConfig();
  const p = config.routes.admin.prefix;
  return withUiLocale(lang, `${p}/appearance/theme-builder/${id}`);
}

/** Localized routes for the current `preferred-locale` cookie (server loaders/actions). */
export function routesFromPreferredCookie(cookie: { get(name: string): unknown }) {
  return getLocalizedRoutes(uiLangFromPreferredCookie(cookie));
}

/**
 * Localized routes for the current qwik-speak UI language.
 * Return value is JSON-serializable (string hrefs only — use `admin*EditHref` for dynamic edit URLs).
 */
export function useAppRoutes() {
  const { lang } = useTranslate();
  return getLocalizedRoutes(lang);
}

/** English-only fallback for non-component code (prefer `getLocalizedRoutes` / `useAppRoutes`). */
export const ROUTES = getLocalizedRoutes('en');
