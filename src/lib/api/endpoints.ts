/**
 * API endpoint definitions
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  // Users
  USERS: {
    LIST: '/users',
    GET: (id: string) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    BULK_DELETE: '/users/bulk-delete',
  },
  // Settings
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },
  // Activity
  ACTIVITY: {
    LIST: '/activity',
    EXPORT: '/activity/export',
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_UNREAD: (id: string) => `/notifications/${id}/unread`,
    DELETE: (id: string) => `/notifications/${id}`,
    PREFERENCES: '/notifications/preferences',
  },
  // System
  SYSTEM: {
    HEALTH: '/system/health',
    STATS: '/system/stats',
  },
  /** Authenticated helpers (admin UI); server enforces uniqueness on the owning table. */
  CONTENT_SLUGS: {
    SUGGEST: '/v1/content-slugs/suggest',
  },
  // Projects
  PROJECTS: {
    LIST: '/v1/projects',
    GET: (id: string | number) => `/v1/projects/${id}`,
    CREATE: '/v1/projects',
    UPDATE: (id: string | number) => `/v1/projects/${id}`,
    DELETE: (id: string | number) => `/v1/projects/${id}`,
    BULK_DELETE: '/v1/projects/bulk-delete',
  },
  // Categories
  CATEGORIES: {
    LIST: '/v1/categories',
    GET: (id: string | number) => `/v1/categories/${id}`,
    CREATE: '/v1/categories',
    UPDATE: (id: string | number) => `/v1/categories/${id}`,
    DELETE: (id: string | number) => `/v1/categories/${id}`,
    BULK_DELETE: '/v1/categories/bulk-delete',
  },


  // Skills
  SKILLS: {
    LIST: '/v1/skills',
    GET: (id: string | number) => `/v1/skills/${id}`,
    CREATE: '/v1/skills',
    UPDATE: (id: string | number) => `/v1/skills/${id}`,
    DELETE: (id: string | number) => `/v1/skills/${id}`,
    BULK_DELETE: '/v1/skills/bulk-delete',
  },
  SERVICES: {
    LIST: '/v1/services',
    GET: (id: string | number) => `/v1/services/${id}`,
    CREATE: '/v1/services',
    UPDATE: (id: string | number) => `/v1/services/${id}`,
    DELETE: (id: string | number) => `/v1/services/${id}`,
    BULK_DELETE: '/v1/services/bulk-delete',
  },
  // Testimonials
  TESTIMONIALS: {
    LIST: '/v1/testimonials',
    GET: (id: string | number) => `/v1/testimonials/${id}`,
    CREATE: '/v1/testimonials',
    UPDATE: (id: string | number) => `/v1/testimonials/${id}`,
    DELETE: (id: string | number) => `/v1/testimonials/${id}`,
    BULK_DELETE: '/v1/testimonials/bulk-delete',
  },
  // Blog
  BLOG: {
    LIST: '/v1/blog-posts',
    GET: (id: string | number) => `/v1/blog-posts/${id}`,
    CREATE: '/v1/blog-posts',
    UPDATE: (id: string | number) => `/v1/blog-posts/${id}`,
    DELETE: (id: string | number) => `/v1/blog-posts/${id}`,
    BULK_DELETE: '/v1/blog-posts/bulk-delete',
  },
  // Menus (WordPress-style nav)
  MENUS: {
    LIST: '/v1/menus',
    GET: (id: string | number) => `/v1/menus/${id}`,
    CREATE: '/v1/menus',
    UPDATE: (id: string | number) => `/v1/menus/${id}`,
    DELETE: (id: string | number) => `/v1/menus/${id}`,
    CREATE_ITEM: (menuId: string | number) => `/v1/menus/${menuId}/items`,
    REORDER_ITEMS: (menuId: string | number) => `/v1/menus/${menuId}/items/reorder`,
    UPDATE_ITEM: (itemId: string | number) => `/v1/menu-items/${itemId}`,
    DELETE_ITEM: (itemId: string | number) => `/v1/menu-items/${itemId}`,
  },
  // Media
  MEDIA: {
    LIST: '/v1/media',
    GET: (id: string | number) => `/v1/media/${id}`,
    UPLOAD: '/v1/media/upload',
    UPDATE: (id: string | number) => `/v1/media/${id}`,
    DELETE: (id: string | number) => `/v1/media/${id}`,
    BULK_DELETE: '/v1/media/bulk-delete',
    FOLDERS: {
      LIST: '/v1/media/folders/list',
      CREATE: '/v1/media/folders',
      UPDATE: (id: string | number) => `/v1/media/folders/${id}`,
      DELETE: (id: string | number) => `/v1/media/folders/${id}`,
    },
    TAGS: {
      LIST: '/v1/media/tags',
      CREATE: '/v1/media/tags',
    },
  },
} as const;
