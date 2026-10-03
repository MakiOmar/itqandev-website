/**
 * Links for the public-site admin quick drawer. Pure so it can be unit-checked; permission rules
 * mirror the dashboard Sidebar (permission, or role fallback where the Sidebar allows it).
 */
import type { User } from '../auth/types';
import { isFeatureModuleEnabled, type FeatureModuleKey } from '../api/project-settings';
import { getConfig } from '../config';
import {
  adminBlogEditHref,
  adminPageBuilderHref,
  adminPageEditHref,
  adminProjectEditHref,
  adminServiceEditHref,
  adminThemeTemplateEditHref,
  getLocalizedRoutes,
} from '../constants/routes';
import { translateApp } from '../i18n/translate-app';
import type { AdminEditTarget } from '../marketing/admin-edit-target';

export type QuickLinkIcon =
  | 'edit'
  | 'builder'
  | 'template'
  | 'home'
  | 'dashboard'
  | 'pages'
  | 'blog'
  | 'projects'
  | 'services'
  | 'forms'
  | 'media'
  | 'menus'
  | 'header'
  | 'footer'
  | 'palette'
  | 'settings'
  | 'system';

export type QuickLink = { id: string; label: string; href: string; icon: QuickLinkIcon; hint?: string };

export type QuickLinkSection = { id: string; title: string; links: QuickLink[] };

type AccessRule = {
  /** Spatie permission that grants access. */
  permission?: string;
  /** Roles that also grant access when the permission is missing (Sidebar `menuManagementRoles`). */
  orRoles?: string[];
  /** Roles required regardless of permissions (Sidebar `roles`). */
  roles?: string[];
  feature?: FeatureModuleKey;
};

type QuickLinksInput = {
  lang: string;
  user: Pick<User, 'role' | 'permissions'>;
  features?: Record<string, boolean>;
  target: AdminEditTarget | null;
  themeTemplateId?: number | null;
};

const CONTENT_EDITOR_ROLES = ['super_admin', 'admin', 'company', 'editor'];
const ADMIN_ROLES = ['super_admin', 'admin'];

const PAGES_RULE: AccessRule = { permission: 'manage pages', orRoles: CONTENT_EDITOR_ROLES, feature: 'pages' };
const APPEARANCE_RULE: AccessRule = { roles: ADMIN_ROLES };

function hasAccess(input: QuickLinksInput, rule: AccessRule): boolean {
  if (rule.feature && !isFeatureModuleEnabled(input.features, rule.feature)) return false;
  const role = input.user.role;
  if (rule.roles && !rule.roles.includes(role)) return false;
  if (rule.permission) {
    const granted = (input.user.permissions ?? []).includes(rule.permission);
    if (!granted && !(rule.orRoles ?? []).includes(role)) return false;
  }
  return true;
}

/** Matches the `manageSystemCache` gate: super_admin, admin, or `manage system`. */
export function canClearCache(user: Pick<User, 'role' | 'permissions'>): boolean {
  return ADMIN_ROLES.includes(user.role) || (user.permissions ?? []).includes('manage system');
}

function currentPageLinks(input: QuickLinksInput): QuickLink[] {
  const { lang, target } = input;
  const t = (key: string) => translateApp(lang, `adminDrawer.${key}`);
  const links: QuickLink[] = [];
  const hint = target && 'title' in target ? target.title : undefined;

  if (target?.kind === 'page' && hasAccess(input, PAGES_RULE)) {
    links.push(
      { id: 'page-builder', label: t('openBuilder'), href: adminPageBuilderHref(lang, target.id), icon: 'builder', hint },
      { id: 'page-edit', label: t('editPage'), href: adminPageEditHref(lang, target.id), icon: 'edit' },
    );
  } else if (target?.kind === 'blog' && hasAccess(input, { permission: 'manage blog', feature: 'blog' })) {
    links.push({ id: 'blog-edit', label: t('editPost'), href: adminBlogEditHref(lang, target.id), icon: 'edit', hint });
  } else if (target?.kind === 'project' && hasAccess(input, { permission: 'manage projects', feature: 'projects' })) {
    links.push({ id: 'project-edit', label: t('editProject'), href: adminProjectEditHref(lang, target.id), icon: 'edit', hint });
  } else if (target?.kind === 'service' && hasAccess(input, { permission: 'manage services', feature: 'services' })) {
    links.push({ id: 'service-edit', label: t('editService'), href: adminServiceEditHref(lang, target.id), icon: 'edit', hint });
  } else if (target?.kind === 'homepage' && !input.themeTemplateId && hasAccess(input, APPEARANCE_RULE)) {
    links.push({ id: 'homepage', label: t('editHomepage'), href: getLocalizedRoutes(lang).ADMIN.APPEARANCE_HOMEPAGE, icon: 'home' });
  }

  if (input.themeTemplateId && hasAccess(input, APPEARANCE_RULE)) {
    links.push({
      id: 'theme-template',
      label: t('editTemplate'),
      href: adminThemeTemplateEditHref(lang, input.themeTemplateId),
      icon: 'template',
    });
  }
  return links;
}

function manageLinks(input: QuickLinksInput): QuickLink[] {
  const R = getLocalizedRoutes(input.lang);
  const t = (key: string) => translateApp(input.lang, `adminDrawer.${key}`);
  const candidates: Array<QuickLink & { rule: AccessRule }> = [
    { id: 'dashboard', label: t('dashboard'), href: R.ADMIN.HOME, icon: 'dashboard', rule: {} },
    { id: 'pages', label: t('pages'), href: R.ADMIN.PAGES, icon: 'pages', rule: PAGES_RULE },
    { id: 'blog', label: t('blog'), href: R.ADMIN.BLOG, icon: 'blog', rule: { permission: 'manage blog', feature: 'blog' } },
    { id: 'projects', label: t('projects'), href: R.ADMIN.PROJECTS, icon: 'projects', rule: { permission: 'manage projects', feature: 'projects' } },
    { id: 'services', label: t('services'), href: R.ADMIN.SERVICES, icon: 'services', rule: { permission: 'manage services', feature: 'services' } },
    { id: 'forms', label: t('forms'), href: R.ADMIN.FORMS, icon: 'forms', rule: { permission: 'manage forms', orRoles: CONTENT_EDITOR_ROLES, feature: 'forms' } },
    { id: 'media', label: t('media'), href: R.ADMIN.MEDIA, icon: 'media', rule: { permission: 'manage media', feature: 'media' } },
    { id: 'menus', label: t('menus'), href: R.ADMIN.MENUS, icon: 'menus', rule: { permission: 'manage menus', orRoles: CONTENT_EDITOR_ROLES } },
  ];
  return candidates.filter((c) => hasAccess(input, c.rule)).map(({ rule: _rule, ...link }) => link);
}

function siteLinks(input: QuickLinksInput): QuickLink[] {
  const R = getLocalizedRoutes(input.lang);
  const t = (key: string) => translateApp(input.lang, `adminDrawer.${key}`);
  const links: QuickLink[] = [];
  if (hasAccess(input, APPEARANCE_RULE)) {
    links.push(
      { id: 'header', label: t('header'), href: R.ADMIN.APPEARANCE_HEADER, icon: 'header' },
      { id: 'footer', label: t('footer'), href: R.ADMIN.APPEARANCE_FOOTER, icon: 'footer' },
      { id: 'theme-builder', label: t('themeBuilder'), href: R.ADMIN.APPEARANCE_THEME_BUILDER, icon: 'template' },
      { id: 'design-kit', label: t('designKit'), href: R.ADMIN.APPEARANCE_DESIGN_KIT, icon: 'palette' },
      { id: 'settings', label: t('settings'), href: R.ADMIN.SETTINGS_GENERAL, icon: 'settings' },
    );
  }
  const systemHealthOn = getConfig().features.systemHealth !== false;
  if (systemHealthOn && hasAccess(input, { permission: 'manage system', orRoles: ADMIN_ROLES })) {
    links.push({ id: 'system', label: t('systemHealth'), href: R.ADMIN.SYSTEM, icon: 'system' });
  }
  return links;
}

/** Drawer sections in display order; empty sections are dropped. */
export function buildAdminQuickSections(input: QuickLinksInput): QuickLinkSection[] {
  const t = (key: string) => translateApp(input.lang, `adminDrawer.${key}`);
  const sections: QuickLinkSection[] = [
    { id: 'current', title: t('thisPage'), links: currentPageLinks(input) },
    { id: 'manage', title: t('manageContent'), links: manageLinks(input) },
    { id: 'site', title: t('siteSettings'), links: siteLinks(input) },
  ];
  return sections.filter((s) => s.links.length > 0);
}
