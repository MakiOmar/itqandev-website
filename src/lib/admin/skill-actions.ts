import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Skill } from '../../types';
import { parseTranslationsJson } from '../content-translations';
import {
  mergeSecondarySkillTranslations,
  shouldWritePrimaryColumns,
} from '../content-display-locale';

function skillPayloadForApi(data: {
  name?: string;
  slug?: string;
  description?: string;
  iconHint?: string;
  content_locale?: string | null;
  translations?: unknown[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.slug !== undefined) body.slug = data.slug;
  if (data.description !== undefined) body.description = data.description;
  if (data.iconHint !== undefined) body.icon_hint = data.iconHint;
  if (data.content_locale !== undefined) body.content_locale = data.content_locale;
  if (data.translations !== undefined && Array.isArray(data.translations)) {
    body.translations = data.translations;
  }
  return body;
}

export const skillSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().optional(),
    description: z.string().optional(),
    icon_hint: z.string().optional(),
    content_locale: z.string().optional(),
    editing_locale: z.string().optional(),
    form_site_default_locale: z.string().optional(),
    effective_primary_locale: z.string().optional(),
    canonical_name: z.string().optional(),
    canonical_description: z.string().optional(),
    translations_json: z.string().optional(),
  })
  .passthrough();

const updateSkillSchema = skillSchema.extend({ id: z.string() });

export function mapSkillFromApi(raw: Record<string, unknown>): Skill {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    content_locale: (raw.content_locale as string | null | undefined) ?? null,
    description: raw.description != null ? String(raw.description) : undefined,
    iconHint: String(raw.icon_hint ?? raw.iconHint ?? ''),
    translations: Array.isArray(raw.translations) ? (raw.translations as Skill['translations']) : [],
    projectsCount: (raw.projects_count ?? raw.projectsCount) as number | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
    seoMetas: Array.isArray(raw.seoMetas)
      ? (raw.seoMetas as Skill['seoMetas'])
      : Array.isArray(raw.seo_metas)
        ? (raw.seo_metas as Skill['seoMetas'])
        : undefined,
  };
}

export const useCreateSkill = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

      let name = String(data.name || '');
      let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
      let iconHint = (data as { icon_hint?: string }).icon_hint;
      let translationsOut: unknown[] | undefined;

      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          translationsOut = parsedTranslations;
        }
      } else {
        name = canonicalName;
        description = canonicalDescription;
        translationsOut = mergeSecondarySkillTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          { name: String(data.name || ''), description: String(data.description ?? '') },
        );
      }

      const apiBody = skillPayloadForApi({
        name,
        slug: data.slug || undefined,
        description,
        iconHint: iconHint || undefined,
        content_locale: contentLocale,
        translations: translationsOut,
      });

      const response = await apiClient.post<Skill>(API_ENDPOINTS.SKILLS.CREATE, apiBody);
      const created = (response as { data?: Skill })?.data ?? response;

      return { success: true, skill: created as Skill };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create skill';
      return fail(500, { message });
    }
  },
  zod$(skillSchema),
);

export type RunSkillUpdateResult =
  | { ok: true; value: { success: true; skill: Skill } }
  | { ok: false; status: number; message: string };

type SkillPutClient = { put: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

async function runSkillUpdateWithApiClient(
  data: Record<string, unknown>,
  apiClient: SkillPutClient,
): Promise<RunSkillUpdateResult> {
  try {
    const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
    const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

    const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
    const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
    const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
    const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
    const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

    let name = String(data.name || '');
    let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
    let iconHint = (data as { icon_hint?: string }).icon_hint;
    let translationsOut: unknown[] | undefined;

    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      translationsOut = undefined;
    } else {
      name = canonicalName;
      description = canonicalDescription;
      translationsOut = mergeSecondarySkillTranslations(
        (data as { translations_json?: string }).translations_json,
        editingLocale,
        { name: String(data.name || ''), description: String(data.description ?? '') },
      );
    }

    const apiBody = skillPayloadForApi({
      name,
      slug: (data.slug as string | undefined) || undefined,
      description,
      iconHint: iconHint || undefined,
      content_locale: contentLocale,
      translations: translationsOut,
    });

    const response = await apiClient.put<Skill>(API_ENDPOINTS.SKILLS.UPDATE(String(data.id)), apiBody);
    const updated = (response as { data?: Skill })?.data ?? response;
    return { ok: true, value: { success: true as const, skill: updated as Skill } };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number }; message?: string };
    const st = e?.status === 401 || e?.response?.status === 401 ? 401 : 500;
    return { ok: false, status: st, message: String(e?.message ?? 'Failed to update skill') };
  }
}

export async function runSkillUpdateFromBrowser(fields: Record<string, unknown>): Promise<RunSkillUpdateResult> {
  const parsed = updateSkillSchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runSkillUpdateWithApiClient(parsed.data as unknown as Record<string, unknown>, getApiClient(null) as SkillPutClient);
}

export const useDeleteSkill = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
    await apiClient.delete(API_ENDPOINTS.SKILLS.DELETE((data as { id: string }).id));
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete skill';
    return fail(500, { message });
  }
});

export const useBulkDeleteSkills = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
    const idsRaw = (data as { ids?: string | string[] }).ids;
    const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : [];
    await apiClient.post(API_ENDPOINTS.SKILLS.BULK_DELETE, { ids });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete skills';
    return fail(500, { message });
  }
});
