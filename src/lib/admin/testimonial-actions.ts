import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Testimonial } from '../../types';
import { parseTranslationsJson } from '../content-translations';
import {
  mergeSecondaryTestimonialTranslations,
  shouldWritePrimaryColumns,
} from '../content-display-locale';

/**
 * Normalize Laravel (snake_case) or camelCase testimonial JSON for admin UI
 */
export function mapTestimonialFromApi(raw: Record<string, unknown>): Testimonial {
  const projectRaw = raw.project as Record<string, unknown> | undefined | null;
  let project: Testimonial['project'] | undefined;
  if (projectRaw && projectRaw.id != null) {
    project = {
      id: Number(projectRaw.id),
      title: String(projectRaw.title ?? ''),
    };
  }
  const translationsRaw = raw.translations;
  const translations = Array.isArray(translationsRaw)
    ? (translationsRaw as Record<string, unknown>[]).map((tr) => ({
        id: tr.id != null ? Number(tr.id) : undefined,
        locale: String(tr.locale ?? ''),
        content: tr.content != null ? String(tr.content) : null,
        client_role:
          tr.client_role != null
            ? String(tr.client_role)
            : tr.clientRole != null
              ? String(tr.clientRole)
              : null,
        company: tr.company != null ? String(tr.company) : null,
      }))
    : undefined;

  return {
    id: Number(raw.id),
    projectId:
      raw.project_id != null
        ? Number(raw.project_id)
        : raw.projectId != null
          ? Number(raw.projectId)
          : undefined,
    contentLocale: (raw.content_locale ?? raw.contentLocale ?? null) as string | null,
    clientName: String(raw.client_name ?? raw.clientName ?? ''),
    clientRole:
      (raw.client_role ?? raw.clientRole) != null
        ? String(raw.client_role ?? raw.clientRole)
        : undefined,
    company: raw.company != null ? String(raw.company) : undefined,
    rating: raw.rating != null ? Number(raw.rating) : 5,
    content: String(raw.content ?? ''),
    videoUrl:
      raw.video_url != null
        ? String(raw.video_url)
        : raw.videoUrl != null
          ? String(raw.videoUrl)
          : undefined,
    approved: Boolean(raw.approved ?? false),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
    translations,
    project,
  };
}

function formatTestimonialApiError(err: unknown): string {
  const e = err as { message?: string; status?: number; errors?: Record<string, string[] | string> };
  const base = String(e?.message ?? 'Request failed');
  if (e?.status === 422 && e.errors && typeof e.errors === 'object') {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(e.errors)) {
      if (Array.isArray(v)) {
        for (const m of v) {
          lines.push(`${k}: ${m}`);
        }
      } else if (v != null) {
        lines.push(`${k}: ${String(v)}`);
      }
    }
    if (lines.length > 0) {
      return `${base} — ${lines.slice(0, 8).join('; ')}`.slice(0, 800);
    }
  }
  return base.slice(0, 600);
}

/** Laravel expects snake_case JSON keys. */
function testimonialPayloadForApi(data: {
  project_id?: number | null;
  content_locale?: string | null;
  client_name?: string;
  client_role?: string;
  company?: string;
  rating?: number;
  content?: string;
  video_url?: string;
  approved?: boolean;
  translations?: unknown[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.project_id !== undefined) {
    body.project_id = data.project_id;
  }
  if (data.content_locale !== undefined) {
    body.content_locale = data.content_locale;
  }
  if (data.client_name !== undefined) {
    body.client_name = data.client_name;
  }
  if (data.client_role !== undefined) {
    body.client_role = data.client_role;
  }
  if (data.company !== undefined) {
    body.company = data.company;
  }
  if (data.rating !== undefined) {
    body.rating = data.rating;
  }
  if (data.content !== undefined) {
    body.content = data.content;
  }
  if (data.video_url !== undefined) {
    body.video_url = data.video_url;
  }
  if (data.approved !== undefined) {
    body.approved = data.approved;
  }
  if (data.translations !== undefined && Array.isArray(data.translations)) {
    body.translations = data.translations;
  }
  return body;
}

const toBool = (v: unknown) => v === true || v === '1' || v === 'on' || v === 'true';

export const testimonialFormSchema = z
  .object({
    project_id: z.string().optional(),
    client_name: z.string().min(1, 'Client name is required'),
    client_role: z.string().optional(),
    company: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional(),
    content: z.string().min(1, 'Content is required'),
    video_url: z.string().url().optional().or(z.literal('')),
    approved: z.union([z.boolean(), z.string()]).optional(),
    content_locale: z.string().optional(),
    editing_locale: z.string().optional(),
    form_site_default_locale: z.string().optional(),
    effective_primary_locale: z.string().optional(),
    canonical_client_name: z.string().optional(),
    canonical_content: z.string().optional(),
    canonical_client_role: z.string().optional(),
    canonical_company: z.string().optional(),
    translations_json: z.string().optional(),
  })
  .passthrough();

const updateTestimonialSchema = testimonialFormSchema.extend({ id: z.string() });

type TestimonialPostClient = { post: <T>(endpoint: string, body?: unknown) => Promise<unknown> };
type TestimonialPutClient = { put: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

export type RunTestimonialCreateResult =
  | { ok: true; value: { success: true; testimonial: Testimonial } }
  | { ok: false; status: number; message: string };

async function runTestimonialCreateWithApiClient(
  data: Record<string, unknown>,
  apiClient: TestimonialPostClient,
): Promise<RunTestimonialCreateResult> {
  try {
    const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
    const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

    const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
    const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
    const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
    const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
    const canonicalClientName = String((data as { canonical_client_name?: string }).canonical_client_name ?? '');
    const canonicalContent = String((data as { canonical_content?: string }).canonical_content ?? '');
    const canonicalClientRole = String((data as { canonical_client_role?: string }).canonical_client_role ?? '');
    const canonicalCompany = String((data as { canonical_company?: string }).canonical_company ?? '');

    let clientName = String(data.client_name || '');
    let content = String(data.content || '');
    let clientRole = data.client_role != null ? String(data.client_role) : '';
    let company = data.company != null ? String(data.company) : '';
    let translationsOut: unknown[] | undefined;

    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      if (parsedTranslations) {
        translationsOut = parsedTranslations;
      }
    } else {
      if (!canonicalClientName.trim() || !canonicalContent.trim()) {
        return {
          ok: false,
          status: 422,
          message:
            'Enter the client name and testimonial content in the primary content language first, then add translations.',
        };
      }
      clientName = canonicalClientName;
      content = canonicalContent;
      clientRole = canonicalClientRole;
      company = canonicalCompany;
      translationsOut = mergeSecondaryTestimonialTranslations(
        (data as { translations_json?: string }).translations_json,
        editingLocale,
        {
          content: String(data.content || ''),
          client_role: String(data.client_role ?? ''),
          company: String(data.company ?? ''),
        },
      );
    }

    const projectIdRaw = (data as { project_id?: string }).project_id;
    const projectId =
      projectIdRaw != null && String(projectIdRaw).trim() !== '' ? Number(projectIdRaw) : null;

    const apiBody = testimonialPayloadForApi({
      project_id: projectId,
      content_locale: contentLocale,
      client_name: clientName,
      client_role: clientRole || undefined,
      company: company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : Number(data.rating ?? 5),
      content,
      video_url: (data as { video_url?: string }).video_url || undefined,
      approved: toBool((data as { approved?: unknown }).approved),
      translations: translationsOut,
    });

    const response = await apiClient.post<Testimonial>(API_ENDPOINTS.TESTIMONIALS.CREATE, apiBody);
    const raw = (response as { data?: Record<string, unknown> })?.data ?? (response as Record<string, unknown>);
    const created = mapTestimonialFromApi(raw && typeof raw === 'object' ? raw : {});

    if (created.id == null || Number.isNaN(created.id)) {
      return { ok: false, status: 500, message: 'Create succeeded but no testimonial id was returned.' };
    }

    return { ok: true, value: { success: true as const, testimonial: created } };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number } };
    const st =
      e?.status === 401 || e?.response?.status === 401
        ? 401
        : e?.status === 422 || e?.response?.status === 422
          ? 422
          : 500;
    return { ok: false, status: st, message: formatTestimonialApiError(err) || 'Failed to create testimonial' };
  }
}

export async function runTestimonialCreateFromBrowser(
  fields: Record<string, unknown>,
): Promise<RunTestimonialCreateResult> {
  const parsed = testimonialFormSchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runTestimonialCreateWithApiClient(
    parsed.data as unknown as Record<string, unknown>,
    getApiClient(null) as TestimonialPostClient,
  );
}

export const useCreateTestimonial = routeAction$(async (data, { cookie, request, fail }) => {
  const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
  const r = await runTestimonialCreateWithApiClient(data as unknown as Record<string, unknown>, apiClient as TestimonialPostClient);
  if (!r.ok) {
    return fail(r.status, { message: r.message });
  }
  return r.value;
}, zod$(testimonialFormSchema));

export type RunTestimonialUpdateResult =
  | { ok: true; value: { success: true; testimonial: Testimonial } }
  | { ok: false; status: number; message: string };

async function runTestimonialUpdateWithApiClient(
  data: Record<string, unknown>,
  apiClient: TestimonialPutClient,
): Promise<RunTestimonialUpdateResult> {
  try {
    const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
    const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

    const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
    const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
    const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
    const canonicalClientName = String((data as { canonical_client_name?: string }).canonical_client_name ?? '');
    const canonicalContent = String((data as { canonical_content?: string }).canonical_content ?? '');
    const canonicalClientRole = String((data as { canonical_client_role?: string }).canonical_client_role ?? '');
    const canonicalCompany = String((data as { canonical_company?: string }).canonical_company ?? '');

    let clientName = String(data.client_name || '');
    let content = String(data.content || '');
    let clientRole = data.client_role != null ? String(data.client_role) : '';
    let company = data.company != null ? String(data.company) : '';
    let translationsOut: unknown[] | undefined;

    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      translationsOut = undefined;
    } else {
      clientName = canonicalClientName || clientName;
      content = canonicalContent;
      clientRole = canonicalClientRole;
      company = canonicalCompany;
      translationsOut = mergeSecondaryTestimonialTranslations(
        (data as { translations_json?: string }).translations_json,
        editingLocale,
        {
          content: String(data.content || ''),
          client_role: String(data.client_role ?? ''),
          company: String(data.company ?? ''),
        },
      );
    }

    const projectIdRaw = (data as { project_id?: string }).project_id;
    const projectId =
      projectIdRaw != null && String(projectIdRaw).trim() !== '' ? Number(projectIdRaw) : null;

    const apiBody = testimonialPayloadForApi({
      project_id: projectId,
      content_locale: contentLocale,
      client_name: clientName,
      client_role: clientRole || undefined,
      company: company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : Number(data.rating ?? 5),
      content,
      video_url: (data as { video_url?: string }).video_url || undefined,
      approved: toBool((data as { approved?: unknown }).approved),
      translations: translationsOut,
    });

    const response = await apiClient.put<Testimonial>(
      API_ENDPOINTS.TESTIMONIALS.UPDATE(String(data.id)),
      apiBody,
    );
    const raw = (response as { data?: Record<string, unknown> })?.data ?? (response as Record<string, unknown>);
    const updated = mapTestimonialFromApi(raw && typeof raw === 'object' ? raw : {});

    return { ok: true, value: { success: true as const, testimonial: updated } };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number } };
    const st =
      e?.status === 401 || e?.response?.status === 401
        ? 401
        : e?.status === 422 || e?.response?.status === 422
          ? 422
          : 500;
    return { ok: false, status: st, message: formatTestimonialApiError(err) || 'Failed to update testimonial' };
  }
}

export async function runTestimonialUpdateFromBrowser(
  fields: Record<string, unknown>,
): Promise<RunTestimonialUpdateResult> {
  const parsed = updateTestimonialSchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runTestimonialUpdateWithApiClient(
    parsed.data as unknown as Record<string, unknown>,
    getApiClient(null) as TestimonialPutClient,
  );
}

export const useUpdateTestimonial = routeAction$(async (data, { cookie, request, fail }) => {
  const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
  const r = await runTestimonialUpdateWithApiClient(data as unknown as Record<string, unknown>, apiClient as TestimonialPutClient);
  if (!r.ok) {
    return fail(r.status, { message: r.message });
  }
  return r.value;
}, zod$(updateTestimonialSchema));

const deleteTestimonialSchema = z.object({ id: z.string().min(1) });
const bulkDeleteTestimonialsSchema = z.object({
  ids: z.union([z.array(z.string()), z.string()]),
});

export type RunTestimonialDeleteResult = { ok: true } | { ok: false; message: string };

type TestimonialDeleteClient = { delete: <T>(endpoint: string) => Promise<unknown> };
type TestimonialBulkDeleteClient = { post: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

function normalizeTestimonialIds(ids: string | string[] | undefined): number[] {
  const raw = Array.isArray(ids) ? ids : ids ? [ids] : [];
  return raw
    .map((id) => Number(id))
    .filter((n) => Number.isInteger(n) && n > 0);
}

async function runTestimonialDeleteWithApiClient(
  id: string,
  apiClient: TestimonialDeleteClient,
): Promise<RunTestimonialDeleteResult> {
  const trimmed = String(id ?? '').trim();
  if (trimmed === '') {
    return { ok: false, message: 'Missing testimonial id' };
  }
  try {
    await apiClient.delete(API_ENDPOINTS.TESTIMONIALS.DELETE(trimmed));
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: formatTestimonialApiError(err) || 'Failed to delete testimonial' };
  }
}

async function runTestimonialBulkDeleteWithApiClient(
  ids: string | string[] | undefined,
  apiClient: TestimonialBulkDeleteClient,
): Promise<RunTestimonialDeleteResult> {
  const numericIds = normalizeTestimonialIds(ids);
  if (numericIds.length === 0) {
    return { ok: false, message: 'No testimonials selected' };
  }
  try {
    await apiClient.post(API_ENDPOINTS.TESTIMONIALS.BULK_DELETE, { ids: numericIds });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: formatTestimonialApiError(err) || 'Failed to delete testimonials' };
  }
}

/** Browser delete — avoids `routeAction$.submit` returning undefined while HTTP succeeds. */
export async function runTestimonialDeleteFromBrowser(id: string | number): Promise<RunTestimonialDeleteResult> {
  return runTestimonialDeleteWithApiClient(String(id), getApiClient(null) as TestimonialDeleteClient);
}

export async function runTestimonialBulkDeleteFromBrowser(
  ids: (string | number)[],
): Promise<RunTestimonialDeleteResult> {
  return runTestimonialBulkDeleteWithApiClient(
    ids.map((id) => String(id)),
    getApiClient(null) as TestimonialBulkDeleteClient,
  );
}

/**
 * Admin: delete testimonial
 */
export const useDeleteTestimonial = routeAction$(async (data, { cookie, request, fail }) => {
  const parsed = deleteTestimonialSchema.safeParse(data);
  if (!parsed.success) {
    return fail(422, { message: 'Invalid testimonial id' });
  }
  const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
  const r = await runTestimonialDeleteWithApiClient(parsed.data.id, apiClient as TestimonialDeleteClient);
  if (!r.ok) {
    return fail(500, { message: r.message });
  }
  return { success: true };
}, zod$(deleteTestimonialSchema));

/**
 * Admin: bulk delete testimonials
 */
export const useBulkDeleteTestimonials = routeAction$(async (data, { cookie, request, fail }) => {
  const parsed = bulkDeleteTestimonialsSchema.safeParse(data);
  if (!parsed.success) {
    return fail(422, { message: 'Invalid selection' });
  }
  const apiClient = getApiClient(extractCookieHeader(cookie, request as Parameters<typeof extractCookieHeader>[1]));
  const r = await runTestimonialBulkDeleteWithApiClient(parsed.data.ids, apiClient as TestimonialBulkDeleteClient);
  if (!r.ok) {
    return fail(500, { message: r.message });
  }
  return { success: true };
}, zod$(bulkDeleteTestimonialsSchema));
