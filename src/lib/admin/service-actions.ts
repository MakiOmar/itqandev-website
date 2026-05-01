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

export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  short_description: z.string().optional(),
  description: z.string().optional(),
  process_lines: z.string().optional(),
  deliverables_lines: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.union([z.string(), z.number()]).optional(),
  is_published: z.union([z.boolean(), z.string()]).optional(),
});

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
      return fail(500, { message: err?.message || 'Failed to create service' });
    }
  },
  zod$(serviceSchema),
);

export const useUpdateService = routeAction$(
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

      const rawPubU = (data as any).is_published;
      const isPublishedU =
        rawPubU === undefined || rawPubU === null || String(rawPubU) === '' ? true : toBool(rawPubU);

      const apiBody = servicePayloadForApi({
        name,
        slug: data.slug || undefined,
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

      // #region agent log
      const tr = apiBody.translations;
      fetch('http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '08cfc0',
        },
        body: JSON.stringify({
          sessionId: '08cfc0',
          runId: 'svc-ar-debug',
          hypothesisId: 'H3',
          location: 'service-actions.ts:useUpdateService',
          message: 'service PUT merge summary',
          data: {
            editingLocale,
            effectivePrimary,
            contentLocale,
            writePrimary: shouldWritePrimaryColumns(editingLocale, effectivePrimary),
            translationsCount: Array.isArray(tr) ? tr.length : null,
            translationLocales: Array.isArray(tr)
              ? tr.map((x: unknown) =>
                  x && typeof x === 'object' ? String((x as Record<string, unknown>).locale ?? '') : '',
                )
              : [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const response = await apiClient.put<AdminService>(
        API_ENDPOINTS.SERVICES.UPDATE(String((data as any).id)),
        apiBody,
      );
      const updated = (response as any)?.data ?? response;
      return { success: true, service: updated as AdminService };
    } catch (err: any) {
      return fail(500, { message: err?.message || 'Failed to update service' });
    }
  },
  zod$(serviceSchema.extend({ id: z.string() })),
);

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
