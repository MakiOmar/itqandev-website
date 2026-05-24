import type { FeatureModuleKey } from '../api/project-settings';
import { stripUiLocaleFromPathname } from '../i18n/ui-locale-path';

/**
 * Maps Qwik admin logical paths to config/features.php module keys.
 */
const ADMIN_PATH_MODULE: Array<{ prefix: string; module: FeatureModuleKey }> = [
  { prefix: '/admin/projects', module: 'projects' },
  { prefix: '/admin/categories', module: 'categories' },
  { prefix: '/admin/skills', module: 'skills' },
  { prefix: '/admin/services', module: 'services' },
  { prefix: '/admin/testimonials', module: 'testimonials' },
  { prefix: '/admin/blog', module: 'blog' },
  { prefix: '/admin/media', module: 'media' },
  { prefix: '/admin/users', module: 'users' },
];

/**
 * Resolve feature module for an admin URL pathname (may include /en prefix).
 */
export function getFeatureModuleForAdminPath(pathname: string): FeatureModuleKey | null {
  const logical = stripUiLocaleFromPathname(pathname.replace(/\/+$/, '') || '/');
  for (const { prefix, module } of ADMIN_PATH_MODULE) {
    if (logical === prefix || logical.startsWith(`${prefix}/`)) {
      return module;
    }
  }
  return null;
}

/**
 * Marketing nav href patterns → feature module (public header filtering).
 */
export function getFeatureModuleForPublicHref(href: string): FeatureModuleKey | null {
  const path = href.replace(/\/+$/, '').toLowerCase();
  if (path.includes('/work') || path.includes('/portfolio')) {
    return 'projects';
  }
  if (path.includes('/services')) {
    return 'services';
  }
  if (path.includes('/blog')) {
    return 'blog';
  }
  return null;
}
