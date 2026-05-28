import type { BlogPost } from '../types/blog';
import type { Category } from '../types/category';
import type { Project } from '../types/project';
import type { AdminService } from '../types/service';
import type { Skill } from '../types/skill';
import type { Testimonial } from '../types/testimonial';
import type { SiteLanguageRow } from '../types/site-language';
import { parseTranslationsJson } from './content-translations';

/**
 * Effective primary locale for a record (matches backend SiteLanguages::primaryLocaleForContent).
 */
export function primaryLocaleForContent(
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocale: string | null | undefined,
): string {
  const list = Array.isArray(siteLanguages) && siteLanguages.length > 0 ? siteLanguages : [{ code: 'en', label: 'English', native_label: 'English', rtl: false }];
  const codes = new Set(list.map((l) => String(l.code).toLowerCase()));
  const raw =
    contentLocale != null && String(contentLocale).trim() !== '' ? String(contentLocale).trim().toLowerCase() : '';
  const def = (siteDefaultLocale || 'en').toLowerCase();
  return raw && codes.has(raw) ? raw : def;
}

/**
 * Locale for content-editing mode (matches dropdown value).
 * If `siteLanguages` is stale/incomplete vs the dropdown (loader race), snapping `ar` → primary `en`
 * makes `shouldWritePrimaryColumns` true so Arabic overwrites primary columns instead of translation rows.
 */
export function normalizeEditingLocale(
  requestedLocale: string | null | undefined,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocale: string | null | undefined,
): string {
  const list =
    Array.isArray(siteLanguages) && siteLanguages.length > 0
      ? siteLanguages
      : [{ code: 'en', label: 'English', native_label: 'English', rtl: false }];
  const codes = new Set(list.map((l) => String(l.code).toLowerCase()));
  const req = requestedLocale != null ? String(requestedLocale).trim().toLowerCase() : '';
  if (req && codes.has(req)) {
    return req;
  }
  if (req !== '') {
    return req;
  }
  return primaryLocaleForContent(siteLanguages, siteDefaultLocale, contentLocale);
}

/** Whether selected editing locale should write into primary/base columns. */
export function shouldWritePrimaryColumns(editingLocale: string, effectivePrimaryLocale: string): boolean {
  return editingLocale.trim().toLowerCase() === effectivePrimaryLocale.trim().toLowerCase();
}

/** Fields to show in main form inputs for the current dashboard language. */
export function mergeBlogPostFieldsForUiLocale(
  post: BlogPost,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { title: string; excerpt: string; content: string } {
  const primary = primaryLocaleForContent(siteLanguages, siteDefaultLocale, contentLocaleOverride ?? post.content_locale ?? null);
  const u = uiLocale.toLowerCase();
  if (u === primary) {
    return {
      title: post.title ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
    };
  }
  const row = post.translations?.find((t) => String(t.locale).toLowerCase() === u);
  return {
    title: row?.title != null && row.title !== '' ? row.title : post.title ?? '',
    excerpt: row?.excerpt != null && row.excerpt !== '' ? row.excerpt : post.excerpt ?? '',
    content: row?.content != null && row.content !== '' ? row.content : post.content ?? '',
  };
}

export function mergeProjectFieldsForUiLocale(
  project: Project,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { title: string; summary: string; description: string } {
  const primary = primaryLocaleForContent(siteLanguages, siteDefaultLocale, contentLocaleOverride ?? project.content_locale ?? null);
  const u = uiLocale.toLowerCase();
  if (u === primary) {
    return {
      title: project.title ?? '',
      summary: project.summary ?? '',
      description: project.description ?? '',
    };
  }
  const row = project.translations?.find((t) => String(t.locale).toLowerCase() === u);
  return {
    title: row?.title != null && row.title !== '' ? row.title : project.title ?? '',
    summary: row?.summary != null && row.summary !== '' ? row.summary : project.summary ?? '',
    description: row?.description != null && row.description !== '' ? row.description : project.description ?? '',
  };
}

export function mergeCategoryFieldsForUiLocale(
  category: Category,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { name: string; description: string } {
  const primary = primaryLocaleForContent(
    siteLanguages,
    siteDefaultLocale,
    contentLocaleOverride ?? (category as any).content_locale ?? null,
  );
  const u = uiLocale.toLowerCase();
  const baseName = category.name ?? '';
  const baseDescription = (category.description as any) ?? '';
  if (u === primary) {
    return { name: baseName, description: baseDescription };
  }
  const row = (category as any).translations?.find((t: any) => String(t?.locale).toLowerCase() === u);
  return {
    name: row?.name != null && row.name !== '' ? row.name : baseName,
    description: row?.description != null && row.description !== '' ? row.description : baseDescription,
  };
}

/**
 * Merge main-field edits for a secondary UI locale into translations_json rows (blog).
 */
export function mergeSecondaryBlogTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; excerpt: string; content: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title, excerpt: edited.excerpt, content: edited.content };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

/**
 * Merge main-field edits for a secondary UI locale into translations_json rows (project).
 */
export function mergeSecondaryProjectTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { title: string; summary: string; description: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, title: edited.title, summary: edited.summary, description: edited.description };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

export function mergeSecondaryCategoryTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { name: string; description: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, name: edited.name, description: edited.description };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

export function mergeSkillFieldsForUiLocale(
  skill: Skill,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { name: string; description: string } {
  const primary = primaryLocaleForContent(
    siteLanguages,
    siteDefaultLocale,
    contentLocaleOverride ?? (skill as any).content_locale ?? null,
  );
  const u = uiLocale.toLowerCase();
  const baseName = skill.name ?? '';
  const baseDescription = (skill.description as any) ?? '';
  if (u === primary) {
    return { name: baseName, description: baseDescription };
  }
  const row = (skill as any).translations?.find((t: any) => String(t?.locale).toLowerCase() === u);
  return {
    name: row?.name != null && row.name !== '' ? row.name : baseName,
    description: row?.description != null && row.description !== '' ? row.description : baseDescription,
  };
}

export function mergeTestimonialFieldsForUiLocale(
  testimonial: Testimonial,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): { content: string; client_role: string; company: string } {
  const primary = primaryLocaleForContent(
    siteLanguages,
    siteDefaultLocale,
    contentLocaleOverride ?? testimonial.contentLocale ?? null,
  );
  const u = uiLocale.toLowerCase();
  const baseContent = testimonial.content ?? '';
  const baseRole = testimonial.clientRole ?? '';
  const baseCompany = testimonial.company ?? '';
  if (u === primary) {
    return { content: baseContent, client_role: baseRole, company: baseCompany };
  }
  const row = testimonial.translations?.find((t) => String(t?.locale).toLowerCase() === u);
  return {
    content: row?.content != null && row.content !== '' ? row.content : baseContent,
    client_role: row?.client_role != null && row.client_role !== '' ? row.client_role : baseRole,
    company: row?.company != null && row.company !== '' ? row.company : baseCompany,
  };
}

export function mergeSecondaryTestimonialTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { content: string; client_role: string; company: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = {
    locale: u,
    content: edited.content,
    client_role: edited.client_role,
    company: edited.company,
  };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

export function mergeSecondarySkillTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: { name: string; description: string },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = { locale: u, name: edited.name, description: edited.description };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.map((x) => String(x ?? '').trim()).filter((s) => s.length > 0);
}

export function mergeServiceFieldsForUiLocale(
  service: AdminService,
  uiLocale: string,
  siteLanguages: SiteLanguageRow[] | undefined | null,
  siteDefaultLocale: string | undefined | null,
  contentLocaleOverride?: string | null,
): {
  name: string;
  short_description: string;
  description: string;
  process: string[];
  deliverables: string[];
} {
  const primary = primaryLocaleForContent(
    siteLanguages,
    siteDefaultLocale,
    contentLocaleOverride ?? service.content_locale ?? null,
  );
  const u = uiLocale.toLowerCase();
  const baseName = service.name ?? '';
  const baseShort = service.short_description ?? '';
  const baseDesc = service.description ?? '';
  const baseProcess = normalizeStringArray(service.process);
  const baseDel = normalizeStringArray(service.deliverables);
  if (u === primary) {
    return {
      name: baseName,
      short_description: baseShort,
      description: baseDesc,
      process: baseProcess,
      deliverables: baseDel,
    };
  }
  const row = service.translations?.find((t) => String(t?.locale).toLowerCase() === u);
  return {
    name: row?.name != null && row.name !== '' ? row.name : baseName,
    short_description: row?.short_description != null && row.short_description !== '' ? row.short_description : baseShort,
    description: row?.description != null && row.description !== '' ? row.description : baseDesc,
    process: normalizeStringArray(row?.process).length > 0 ? normalizeStringArray(row?.process) : baseProcess,
    deliverables: normalizeStringArray(row?.deliverables).length > 0 ? normalizeStringArray(row?.deliverables) : baseDel,
  };
}

export function mergeSecondaryServiceTranslations(
  translationsJson: string | undefined,
  uiLocale: string,
  edited: {
    name: string;
    short_description: string;
    description: string;
    process: string[];
    deliverables: string[];
  },
): unknown[] {
  const base = parseTranslationsJson(translationsJson) ?? [];
  const u = uiLocale.toLowerCase();
  const idx = base.findIndex((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as Record<string, unknown>).locale ?? '').toLowerCase() === u;
  });
  const row = {
    locale: u,
    name: edited.name,
    short_description: edited.short_description,
    description: edited.description,
    process: edited.process,
    deliverables: edited.deliverables,
  };
  if (idx >= 0) {
    base[idx] = { ...(base[idx] as object), ...row };
  } else {
    base.push(row);
  }
  return base;
}
