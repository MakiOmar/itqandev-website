import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { ensurePageLayoutBands } from './page-layout';
import { formatAppearanceError } from './appearance-actions';
import { triggerJsonDownload } from './content-import-export';
import type { PageSectionNode } from '../marketing/appearance-types';
import type {
  ChromeLayoutKind,
  ChromeLayoutMeta,
  ChromeLayoutStatus,
  ChromeTypeDefaults,
} from '../../types/chrome-layout';

function listEndpoint(kind: ChromeLayoutKind): string {
  if (kind === 'footer') return API_ENDPOINTS.APPEARANCE.FOOTERS;
  if (kind === 'body') return API_ENDPOINTS.APPEARANCE.BODIES;
  if (kind === 'single') return API_ENDPOINTS.APPEARANCE.SINGLES;
  if (kind === 'archive') return API_ENDPOINTS.APPEARANCE.ARCHIVES;
  if (kind === 'loop_item') return API_ENDPOINTS.APPEARANCE.LOOP_ITEMS;
  if (kind === 'overlay') return API_ENDPOINTS.APPEARANCE.OVERLAYS;
  return API_ENDPOINTS.APPEARANCE.HEADERS;
}

function itemEndpoint(kind: ChromeLayoutKind, id: string | number): string {
  if (kind === 'footer') return API_ENDPOINTS.APPEARANCE.FOOTER_GET(id);
  if (kind === 'body') return API_ENDPOINTS.APPEARANCE.BODY_GET(id);
  if (kind === 'single') return API_ENDPOINTS.APPEARANCE.SINGLE_GET(id);
  if (kind === 'archive') return API_ENDPOINTS.APPEARANCE.ARCHIVE_GET(id);
  if (kind === 'loop_item') return API_ENDPOINTS.APPEARANCE.LOOP_ITEM_GET(id);
  if (kind === 'overlay') return API_ENDPOINTS.APPEARANCE.OVERLAY_GET(id);
  return API_ENDPOINTS.APPEARANCE.HEADER_GET(id);
}

function setDefaultEndpoint(kind: ChromeLayoutKind, id: string | number): string {
  if (kind === 'footer') return API_ENDPOINTS.APPEARANCE.FOOTER_SET_DEFAULT(id);
  return API_ENDPOINTS.APPEARANCE.HEADER_SET_DEFAULT(id);
}

function mapLayout(raw: Record<string, unknown>): ChromeLayoutMeta {
  const sections = Array.isArray(raw.sections)
    ? (raw.sections as PageSectionNode[])
    : Array.isArray((raw.document as { sections?: unknown })?.sections)
      ? ((raw.document as { sections: PageSectionNode[] }).sections)
      : undefined;

  const kindRaw = String(raw.kind ?? 'header');
  const kind: ChromeLayoutKind = (
    ['header', 'footer', 'body', 'single', 'archive', 'loop_item', 'overlay'] as ChromeLayoutKind[]
  ).includes(kindRaw as ChromeLayoutKind)
    ? (kindRaw as ChromeLayoutKind)
    : 'header';

  return {
    id: Number(raw.id),
    kind,
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    status: (raw.status === 'published' ? 'published' : 'draft') as ChromeLayoutStatus,
    is_site_default: Boolean(raw.is_site_default),
    created_at: (raw.created_at as string) ?? null,
    updated_at: (raw.updated_at as string) ?? null,
    sections,
    overlay: (raw.overlay as ChromeLayoutMeta['overlay']) ?? null,
    document: raw.document as ChromeLayoutMeta['document'],
  };
}

function normalizeList(body: unknown): ChromeLayoutMeta[] {
  if (Array.isArray(body)) {
    return body.map((x) => mapLayout(x as Record<string, unknown>));
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data).map((x) => mapLayout(x as Record<string, unknown>));
  }
  return [];
}

export async function fetchChromeLayoutsFromBrowser(
  kind: ChromeLayoutKind,
): Promise<ChromeLayoutMeta[]> {
  const api = getApiClient(null);
  const res = await api.get(listEndpoint(kind));
  return normalizeList((res as { data?: unknown })?.data ?? res);
}

export async function fetchChromeLayoutFromBrowser(
  kind: ChromeLayoutKind,
  id: string | number,
): Promise<ChromeLayoutMeta> {
  const api = getApiClient(null);
  const res = await api.get(itemEndpoint(kind, id));
  const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
  const layout = mapLayout(body);
  layout.sections = ensurePageLayoutBands((layout.sections ?? []) as PageSectionNode[]);
  return layout;
}

export async function createChromeLayoutFromBrowser(
  kind: ChromeLayoutKind,
  payload: { name: string; slug?: string; status?: ChromeLayoutStatus },
): Promise<{ success: boolean; id?: number; error?: string; data?: ChromeLayoutMeta }> {
  try {
    const api = getApiClient(null);
    const res = await api.post(listEndpoint(kind), payload);
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    const layout = mapLayout(body);
    return { success: true, id: layout.id, data: layout };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function updateChromeLayoutFromBrowser(
  kind: ChromeLayoutKind,
  id: string | number,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string; data?: ChromeLayoutMeta }> {
  try {
    const api = getApiClient(null);
    const res = await api.put(itemEndpoint(kind, id), payload);
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return {
      success: true,
      message: (res as { message?: string }).message,
      data: mapLayout(body),
    };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function deleteChromeLayoutFromBrowser(
  kind: ChromeLayoutKind,
  id: string | number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = getApiClient(null);
    await api.delete(itemEndpoint(kind, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function setChromeLayoutSiteDefaultFromBrowser(
  kind: ChromeLayoutKind,
  id: string | number,
): Promise<{ success: boolean; error?: string; data?: ChromeLayoutMeta }> {
  try {
    const api = getApiClient(null);
    const res = await api.post(setDefaultEndpoint(kind, id), {});
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return { success: true, data: mapLayout(body) };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export const CHROME_LAYOUTS_EXPORT_FORMAT = 'credocode.chrome-layouts-export';

export type ChromeLayoutsExportEnvelope = {
  format: typeof CHROME_LAYOUTS_EXPORT_FORMAT;
  version: number;
  kind: ChromeLayoutKind;
  exported_at?: string;
  items: Array<{ name: string; slug?: string | null; status?: ChromeLayoutStatus; document: unknown }>;
};

export type ChromeLayoutBulkResult = {
  success: boolean;
  /** Rows deleted / updated / imported (created + updated). */
  count: number;
  created?: number;
  updated?: number;
  skipped: number;
  /** "name: reason" for skipped rows (site default, in use, invalid, …). */
  errors: string[];
  error?: string;
};

function bulkErrors(body: Record<string, unknown>): string[] {
  const rows = Array.isArray(body.errors) ? (body.errors as Array<Record<string, unknown>>) : [];
  return rows.map((row) => `${String(row.name ?? row.slug ?? row.id ?? '')}: ${String(row.message ?? '')}`);
}

/** Download the layouts of `kind` (optionally only `ids`) as a JSON envelope. */
export async function exportChromeLayoutsFromBrowser(
  kind: ChromeLayoutKind,
  ids?: number[],
): Promise<{ success: boolean; envelope?: ChromeLayoutsExportEnvelope; error?: string }> {
  try {
    const query = ids?.length ? `?${ids.map((id) => `ids[]=${encodeURIComponent(id)}`).join('&')}` : '';
    const res = await getApiClient(null).get(`${listEndpoint(kind)}/export${query}`);
    return { success: true, envelope: res.data as ChromeLayoutsExportEnvelope };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

/** Export then trigger a `<filenameBase>-<kind>-layouts-<stamp>.json` download. */
export async function downloadChromeLayoutsExportFromBrowser(
  kind: ChromeLayoutKind,
  filenameBase: string,
  ids?: number[],
): Promise<{ success: boolean; error?: string }> {
  const res = await exportChromeLayoutsFromBrowser(kind, ids);
  if (!res.success || !res.envelope) return { success: false, error: res.error };
  const safeBase = filenameBase.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'layouts';
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  triggerJsonDownload(`${safeBase}-${kind}-layouts-${stamp}.json`, res.envelope);
  return { success: true };
}

/**
 * Accepts a layouts export, or a single builder export (`credocode.builder-export`) of the
 * same kind, which becomes one layout named after the file.
 */
export function toChromeLayoutsImportEnvelope(
  raw: unknown,
  kind: ChromeLayoutKind,
  fallbackName: string,
): ChromeLayoutsExportEnvelope | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  if (data.format === CHROME_LAYOUTS_EXPORT_FORMAT) {
    return data as unknown as ChromeLayoutsExportEnvelope;
  }
  if (data.format === 'credocode.builder-export' && data.builder === kind && data.document) {
    return {
      format: CHROME_LAYOUTS_EXPORT_FORMAT,
      version: 1,
      kind,
      items: [{ name: fallbackName, document: data.document }],
    };
  }
  return null;
}

export async function importChromeLayoutsFromBrowser(
  kind: ChromeLayoutKind,
  envelope: ChromeLayoutsExportEnvelope,
): Promise<ChromeLayoutBulkResult> {
  try {
    const res = (await getApiClient(null).post(`${listEndpoint(kind)}/import`, envelope)).data as Record<string, unknown>;
    const created = Number(res.created ?? 0);
    const updated = Number(res.updated ?? 0);
    return {
      success: true,
      count: created + updated,
      created,
      updated,
      skipped: Number(res.skipped ?? 0),
      errors: bulkErrors(res),
    };
  } catch (err) {
    return { success: false, count: 0, skipped: 0, errors: [], error: formatAppearanceError(err) };
  }
}

export async function bulkDeleteChromeLayoutsFromBrowser(
  kind: ChromeLayoutKind,
  ids: number[],
): Promise<ChromeLayoutBulkResult> {
  try {
    const res = (await getApiClient(null).post(`${listEndpoint(kind)}/bulk-delete`, { ids })).data as Record<string, unknown>;
    return { success: true, count: Number(res.deleted ?? 0), skipped: Number(res.skipped ?? 0), errors: bulkErrors(res) };
  } catch (err) {
    return { success: false, count: 0, skipped: 0, errors: [], error: formatAppearanceError(err) };
  }
}

export async function bulkSetChromeLayoutStatusFromBrowser(
  kind: ChromeLayoutKind,
  ids: number[],
  status: ChromeLayoutStatus,
): Promise<ChromeLayoutBulkResult> {
  try {
    const res = (await getApiClient(null).post(`${listEndpoint(kind)}/bulk-status`, { ids, status })).data as Record<string, unknown>;
    return { success: true, count: Number(res.updated ?? 0), skipped: Number(res.skipped ?? 0), errors: bulkErrors(res) };
  } catch (err) {
    return { success: false, count: 0, skipped: 0, errors: [], error: formatAppearanceError(err) };
  }
}

export async function fetchChromeTypeDefaultsFromBrowser(): Promise<ChromeTypeDefaults> {
  const api = getApiClient(null);
  const res = await api.get(API_ENDPOINTS.APPEARANCE.CHROME_TYPE_DEFAULTS);
  return ((res as { data?: ChromeTypeDefaults })?.data ?? res) as ChromeTypeDefaults;
}

export async function saveChromeTypeDefaultsFromBrowser(
  defaults: ChromeTypeDefaults,
): Promise<{ success: boolean; error?: string; data?: ChromeTypeDefaults }> {
  try {
    const api = getApiClient(null);
    const res = await api.put(API_ENDPOINTS.APPEARANCE.CHROME_TYPE_DEFAULTS, defaults);
    return {
      success: true,
      data: ((res as { data?: ChromeTypeDefaults })?.data ?? defaults) as ChromeTypeDefaults,
    };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function fetchPublishedChromeOptionsFromBrowser(
  kind: ChromeLayoutKind,
): Promise<ChromeLayoutMeta[]> {
  const all = await fetchChromeLayoutsFromBrowser(kind);
  return all.filter((row) => row.status === 'published');
}
