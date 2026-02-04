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
