import { getConfig } from '../config';

/**
 * Application route constants
 * Routes are now loaded from configuration to support admin/public separation
 */
export function getRoutes() {
  const config = getConfig();
  return {
    // Admin routes
    ADMIN: {
      HOME: config.routes.admin.home,
      LOGIN: config.routes.admin.login,
      PROFILE: `${config.routes.admin.prefix}/profile`,
      USERS: `${config.routes.admin.prefix}/users`,
      SETTINGS: `${config.routes.admin.prefix}/settings`,
      SETTINGS_GENERAL: `${config.routes.admin.prefix}/settings/general`,
      SETTINGS_SOCIAL: `${config.routes.admin.prefix}/settings/social`,
      SETTINGS_MEDIA: `${config.routes.admin.prefix}/settings/media`,
      SETTINGS_BRANDING: `${config.routes.admin.prefix}/settings/branding`,
      SETTINGS_LANGUAGES: `${config.routes.admin.prefix}/settings/languages`,
      ACTIVITY: `${config.routes.admin.prefix}/activity`,
      NOTIFICATIONS: `${config.routes.admin.prefix}/notifications`,
      SYSTEM: `${config.routes.admin.prefix}/system`,
      PROJECTS: `${config.routes.admin.prefix}/projects`,
      PROJECTS_NEW: `${config.routes.admin.prefix}/projects/new`,
      PROJECTS_EDIT: (id: string | number) => `${config.routes.admin.prefix}/projects/${id}`,
      CATEGORIES: `${config.routes.admin.prefix}/categories`,
      CATEGORIES_NEW: `${config.routes.admin.prefix}/categories/new`,
      CATEGORIES_EDIT: (id: string | number) => `${config.routes.admin.prefix}/categories/${id}`,
      SKILLS: `${config.routes.admin.prefix}/skills`,
      TESTIMONIALS: `${config.routes.admin.prefix}/testimonials`,
      BLOG: `${config.routes.admin.prefix}/blog`,
      BLOG_NEW: `${config.routes.admin.prefix}/blog/new`,
      BLOG_EDIT: (id: string | number) => `${config.routes.admin.prefix}/blog/${id}`,
      MEDIA: `${config.routes.admin.prefix}/media`,
    },
    // Public routes
    PUBLIC: {
      HOME: config.routes.public.home,
      LOGIN: config.routes.public.login,
    },
    // Legacy routes (for backward compatibility)
    HOME: config.routes.admin.home,
    LOGIN: config.routes.admin.login,
    PROFILE: `${config.routes.admin.prefix}/profile`,
    USERS: `${config.routes.admin.prefix}/users`,
    SETTINGS: `${config.routes.admin.prefix}/settings`,
    ACTIVITY: `${config.routes.admin.prefix}/activity`,
    NOTIFICATIONS: `${config.routes.admin.prefix}/notifications`,
    SYSTEM: `${config.routes.admin.prefix}/system`,
  } as const;
}

/**
 * Get routes object (cached)
 */
export const ROUTES = getRoutes();
