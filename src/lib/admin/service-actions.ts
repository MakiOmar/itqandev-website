import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient, extractCookieHeader } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { AdminService } from '../../types/service';
import { parseTranslationsJson } from '../content-translations';
import {
  mergeSecondaryServiceTranslations,
  shouldWritePrimaryColumns,
} from '../content-display-locale';

function linesToList(raw: string | undefined | null): string[] {
  if (raw == null || String(raw).trim() === '') {
    return [];
  }
  return String(raw)
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function formatServiceApiError(err: unknown): string {
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

function servicePayloadForApi(data: {
  name?: string;
  slug?: string;
  short_description?: string | null;
  description?: string | null;
  process?: string[];
  deliverables?: string[];
  icon?: string | null;
  sort_order?: number;
  is_published?: boolean;
  content_locale?: string | null;
  translations?: unknown[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) {
    body.name = data.name;
  }
  if (data.slug !== undefined) {
    body.slug = data.slug;
  }
  if (data.short_description !== undefined) {
    body.short_description = data.short_description;
  }
  if (data.description !== undefined) {
    body.description = data.description;
  }
  if (data.process !== undefined) {
    body.process = data.process;
  }
  if (data.deliverables !== undefined) {
    body.deliverables = data.deliverables;
  }
  if (data.icon !== undefined) {
    body.icon = data.icon;
  }
  if (data.sort_order !== undefined) {
    body.sort_order = data.sort_order;
  }
  if (data.is_published !== undefined) {
    body.is_published = data.is_published;
  }
  if (data.content_locale !== undefined) {
    body.content_locale = data.content_locale;
  }
  if (data.translations !== undefined && Array.isArray(data.translations)) {
    body.translations = data.translations;
  }
  return body;
}

/**
 * Zod strips unknown keys by default — translation helpers must be declared or mergeSecondary* never sees them (skills schema lists these explicitly).
 */
export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  /** Same as categories: optional here — Laravel validates required slug on create / sometimes on update. */
  slug: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  process_lines: z.string().optional(),
  deliverables_lines: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.union([z.string(), z.number()]).optional(),
  is_published: z.union([z.boolean(), z.string()]).optional(),
  content_locale: z.string().optional(),
  editing_locale: z.string().optional(),
  form_site_default_locale: z.string().optional(),
  effective_primary_locale: z.string().optional(),
  canonical_name: z.string().optional(),
  canonical_short_description: z.string().optional(),
  canonical_description: z.string().optional(),
  canonical_process_lines: z.string().optional(),
  canonical_deliverables_lines: z.string().optional(),
  translations_json: z.string().optional(),
}).passthrough();

const toBool = (v: unknown) => v === true || v === '1' || v === 'on' || v === 'true';

export const useCreateService = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader);

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalShort = String((data as { canonical_short_description?: string }).canonical_short_description ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');
      const canonicalProcess = linesToList((data as { canonical_process_lines?: string }).canonical_process_lines);
      const canonicalDeliverables = linesToList(
        (data as { canonical_deliverables_lines?: string }).canonical_deliverables_lines,
      );

      const process = linesToList((data as { process_lines?: string }).process_lines);
      const deliverables = linesToList((data as { deliverables_lines?: string }).deliverables_lines);

      let name = String(data.name || '');
      let short_description =
        data.short_description !== undefined && data.short_description !== null ? String(data.short_description) : '';
      let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
      let processOut = process;
      let deliverablesOut = deliverables;
      let translationsOut: unknown[] | undefined;

      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          translationsOut = parsedTranslations;
        }
      } else {
        name = canonicalName;
        short_description = canonicalShort;
        description = canonicalDescription;
        processOut = canonicalProcess;
        deliverablesOut = canonicalDeliverables;
        translationsOut = mergeSecondaryServiceTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          {
            name: String(data.name || ''),
            short_description: String(data.short_description ?? ''),
            description: String(data.description ?? ''),
            process,
            deliverables,
          },
        );
      }

      const sortRaw = (data as { sort_order?: string | number }).sort_order;
      const sortParsed = sortRaw !== undefined && sortRaw !== '' ? Number(sortRaw) : undefined;

      const rawPub = (data as any).is_published;
      const isPublished =
        rawPub === undefined || rawPub === null || String(rawPub) === '' ? true : toBool(rawPub);

      const apiBody = servicePayloadForApi({
        name,
        slug: data.slug || undefined,
        short_description,
        description,
        process: processOut,
        deliverables: deliverablesOut,
        icon: (data as { icon?: string }).icon || null,
        sort_order: Number.isFinite(sortParsed) ? sortParsed : undefined,
        is_published: isPublished,
        content_locale: contentLocale,
        translations: translationsOut,
      });

      const response = await apiClient.post<AdminService>(API_ENDPOINTS.SERVICES.CREATE, apiBody);
      const created = (response as any)?.data ?? response;

      return { success: true, service: created as AdminService };
    } catch (err: any) {
      return fail(err?.status === 422 ? 422 : 500, { message: formatServiceApiError(err) || 'Failed to create service' });
    }
  },
  zod$(serviceSchema),
);

const updateServiceSchema = serviceSchema.extend({ id: z.string() });

export type RunServiceUpdateResult =
  | {
      ok: true;
      value: {
        success: true;
        service: AdminService;
        serviceUpdateDebug?: Record<string, unknown>;
        serviceUpdateDebugJson?: string;
      };
    }
  | { ok: false; status: number; message: string };

type PutClient = { put: <T>(endpoint: string, body?: unknown) => Promise<unknown> };

async function runServiceUpdateWithApiClient(
  data: Record<string, unknown>,
  apiClient: PutClient,
): Promise<RunServiceUpdateResult> {
  try {
    const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
    const contentLocale = rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

    const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
    const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
    const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
    const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
    const canonicalShort = String((data as { canonical_short_description?: string }).canonical_short_description ?? '');
    const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');
    const canonicalProcess = linesToList((data as { canonical_process_lines?: string }).canonical_process_lines);
    const canonicalDeliverables = linesToList(
      (data as { canonical_deliverables_lines?: string }).canonical_deliverables_lines,
    );

    const process = linesToList((data as { process_lines?: string }).process_lines);
    const deliverables = linesToList((data as { deliverables_lines?: string }).deliverables_lines);

    let name = String(data.name || '');
    let short_description =
      data.short_description !== undefined && data.short_description !== null ? String(data.short_description) : '';
    let description = data.description !== undefined && data.description !== null ? String(data.description) : undefined;
    let processOut = process;
    let deliverablesOut = deliverables;
    let translationsOut: unknown[] | undefined;

    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      translationsOut = undefined;
    } else {
      name = canonicalName;
      short_description = canonicalShort;
      description = canonicalDescription;
      processOut = canonicalProcess;
      deliverablesOut = canonicalDeliverables;
      translationsOut = mergeSecondaryServiceTranslations(
        (data as { translations_json?: string }).translations_json,
        editingLocale,
        {
          name: String(data.name || ''),
          short_description: String(data.short_description ?? ''),
          description: String(data.description ?? ''),
          process,
          deliverables,
        },
      );
    }

    const sortRaw = (data as { sort_order?: string | number }).sort_order;
    const sortParsed = sortRaw !== undefined && sortRaw !== '' ? Number(sortRaw) : undefined;

    const rawPubU = (data as { is_published?: unknown }).is_published;
    const isPublishedU =
      rawPubU === undefined || rawPubU === null || String(rawPubU) === '' ? true : toBool(rawPubU);

    const apiBody = servicePayloadForApi({
      name,
      slug: (data.slug as string | undefined) || undefined,
      short_description,
      description,
      process: processOut,
      deliverables: deliverablesOut,
      icon: (data as { icon?: string }).icon || null,
      sort_order: Number.isFinite(sortParsed) ? sortParsed : undefined,
      is_published: isPublishedU,
      content_locale: contentLocale,
      translations: translationsOut,
    });

    const writePrimaryDbg = shouldWritePrimaryColumns(editingLocale, effectivePrimary);
    const translationLocalesDbg = Array.isArray(translationsOut)
      ? translationsOut.map((t) => String((t as Record<string, unknown>)?.locale ?? ''))
      : [];

    const response = await apiClient.put<AdminService>(API_ENDPOINTS.SERVICES.UPDATE(String(data.id)), apiBody);
    const updated = (response as { data?: AdminService })?.data ?? response;
    const rt = (updated as { translations?: unknown[] })?.translations;
    const returnedTranslationLocales = Array.isArray(rt)
      ? rt.map((t) => String((t as { locale?: string })?.locale ?? '').toLowerCase())
      : [];

    const devDebug = {
      editingLocale,
      effectivePrimary,
      writePrimary: writePrimaryDbg,
      contentLocale,
      jsonBodyHasTranslationsKey: Object.prototype.hasOwnProperty.call(apiBody, 'translations'),
      translationsRowCount: Array.isArray(translationsOut) ? translationsOut.length : -1,
      translationLocales: translationLocalesDbg,
      firstTranslationNameLen:
        Array.isArray(translationsOut) && translationsOut[0] && typeof translationsOut[0] === 'object'
          ? String((translationsOut[0] as Record<string, unknown>).name ?? '').length
          : 0,
      returnedNamePreview: String((updated as { name?: string })?.name ?? '').slice(0, 80),
      returnedTranslationLocales,
    };

    const dbg =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as ImportMeta).env?.DEV || (import.meta as ImportMeta).env?.MODE === 'development');
    if (!dbg) {
      return { ok: true, value: { success: true as const, service: updated as AdminService } };
    }
    const json = JSON.stringify(devDebug);
    const serviceWithDbg = {
      ...(typeof updated === 'object' && updated !== null ? (updated as Record<string, unknown>) : {}),
      serviceUpdateDebug: devDebug,
    } as unknown as AdminService;
    return {
      ok: true,
      value: {
        success: true as const,
        service: serviceWithDbg,
        serviceUpdateDebug: devDebug,
        serviceUpdateDebugJson: json,
      },
    };
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { status?: number }; message?: string };
    const st = e?.status === 422 || e?.response?.status === 422 ? 422 : 500;
    return { ok: false, status: st, message: formatServiceApiError(err) || 'Failed to update service' };
  }
}

/** Browser save: `routeAction$.submit` + q-data `loaders[action.id]` can leave `result` undefined; this path matches the route action’s Laravel PUT. */
export async function runServiceUpdateFromBrowser(fields: Record<string, unknown>): Promise<RunServiceUpdateResult> {
  const parsed = updateServiceSchema.safeParse(fields);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ').slice(0, 500);
    return { ok: false, status: 422, message: msg || 'Invalid form' };
  }
  return runServiceUpdateWithApiClient(parsed.data as unknown as Record<string, unknown>, getApiClient(null) as PutClient);
}

export const useUpdateService = routeAction$(async (data, { cookie, request, fail }) => {
  const apiClient = getApiClient(extractCookieHeader(cookie, request as any));
  const r = await runServiceUpdateWithApiClient(data as unknown as Record<string, unknown>, apiClient as PutClient);
  if (!r.ok) {
    return fail(r.status, { message: r.message });
  }
  return r.value;
}, zod$(updateServiceSchema));

export const useDeleteService = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);
    await apiClient.delete(API_ENDPOINTS.SERVICES.DELETE((data as any).id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete service' });
  }
});

export const useBulkDeleteServices = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);
    const idsRaw = (data as any).ids;
    const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : [];
    await apiClient.post(API_ENDPOINTS.SERVICES.BULK_DELETE, { ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete services' });
  }
});
