/** Browser-side calls for saved builder templates (`/appearance/templates`). */
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import {
  isBuilderTemplateKind,
  type BuilderTemplateContent,
  type BuilderTemplateKind,
  type BuilderTemplateRow,
} from './builder-templates';
import type { LayoutTreeNode } from './page-layout-tree';
import type { PageLayoutBand } from '../marketing/appearance-types';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

export type TemplateApiRow = Partial<BuilderTemplateRow> & { document?: unknown };

const LEGACY_SAVED_BANDS_KEY = 'cc-saved-builder-bands';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function mapBuilderTemplateRow(raw: TemplateApiRow): BuilderTemplateRow | null {
  const id = Number(raw.id);
  if (!id || !isBuilderTemplateKind(raw.kind)) return null;
  return {
    id,
    name: String(raw.name || `#${id}`),
    kind: raw.kind,
    block_type: raw.block_type ? String(raw.block_type) : null,
    updated_at: raw.updated_at ? String(raw.updated_at) : null,
  };
}

/** The Laravel client leaves `{ success, data: [...] }` list bodies wrapped; accept either shape. */
export function builderTemplateRowsFrom(body: unknown): BuilderTemplateRow[] {
  const list = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown } | null)?.data)
      ? (body as { data: unknown[] }).data
      : [];
  return (list as TemplateApiRow[]).map(mapBuilderTemplateRow).filter((r): r is BuilderTemplateRow => r !== null);
}

export async function runBuilderTemplatesListFromBrowser(): Promise<Result<BuilderTemplateRow[]>> {
  try {
    const res = await getApiClient(null).get<unknown>(API_ENDPOINTS.APPEARANCE.TEMPLATES);
    return { ok: true, data: builderTemplateRowsFrom(res.data) };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to load templates') };
  }
}

export async function runBuilderTemplateContentFromBrowser(id: number): Promise<Result<BuilderTemplateContent>> {
  try {
    const res = await getApiClient(null).get<TemplateApiRow>(API_ENDPOINTS.APPEARANCE.TEMPLATE_GET(id));
    const row = res.data;
    if (!isBuilderTemplateKind(row?.kind) || !row?.document || typeof row.document !== 'object') {
      return { ok: false, message: 'Template content is missing' };
    }
    return { ok: true, data: { kind: row.kind, node: row.document as LayoutTreeNode } };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to load template') };
  }
}

export async function runBuilderTemplateCreateFromBrowser(
  name: string,
  content: BuilderTemplateContent,
): Promise<Result<BuilderTemplateRow>> {
  try {
    const res = await getApiClient(null).post<TemplateApiRow>(API_ENDPOINTS.APPEARANCE.TEMPLATES, {
      name,
      kind: content.kind,
      document: content.node,
    });
    const row = mapBuilderTemplateRow(res.data ?? {});
    return row ? { ok: true, data: row } : { ok: false, message: 'Missing template id' };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to save template') };
  }
}

export async function runBuilderTemplateRenameFromBrowser(id: number, name: string): Promise<Result<BuilderTemplateRow>> {
  try {
    const res = await getApiClient(null).put<TemplateApiRow>(API_ENDPOINTS.APPEARANCE.TEMPLATE_GET(id), { name });
    const row = mapBuilderTemplateRow(res.data ?? {});
    return row ? { ok: true, data: row } : { ok: false, message: 'Missing template id' };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to save template') };
  }
}

export async function runBuilderTemplateDeleteFromBrowser(id: number): Promise<Result<true>> {
  try {
    await getApiClient(null).delete(API_ENDPOINTS.APPEARANCE.TEMPLATE_GET(id));
    return { ok: true, data: true };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to delete template') };
  }
}

export async function runBuilderTemplateBulkDeleteFromBrowser(ids: number[]): Promise<Result<number>> {
  if (ids.length === 0) return { ok: false, message: 'No templates selected' };
  try {
    const res = await getApiClient(null).post<{ deleted?: number }>(API_ENDPOINTS.APPEARANCE.TEMPLATES_BULK_DELETE, { ids });
    return { ok: true, data: Number(res.data?.deleted ?? ids.length) };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Failed to delete templates') };
  }
}

type LegacySavedBand = { id?: string; name?: string; band?: PageLayoutBand };

/**
 * Moves sections saved in this browser by the old "Save section" button to server templates.
 * Entries that fail to upload stay in localStorage for the next attempt. Returns how many moved.
 */
export async function migrateLegacySavedBandsFromBrowser(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  let entries: LegacySavedBand[];
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_SAVED_BANDS_KEY) || '[]');
    entries = Array.isArray(parsed) ? parsed : [];
  } catch {
    entries = [];
  }
  if (entries.length === 0) return 0;
  const left: LegacySavedBand[] = [];
  let moved = 0;
  for (const entry of entries) {
    if (!entry?.band || typeof entry.band !== 'object') continue;
    const kind: BuilderTemplateKind = 'band';
    const res = await runBuilderTemplateCreateFromBrowser(String(entry.name || 'Saved section'), { kind, node: entry.band });
    if (res.ok) moved += 1;
    else left.push(entry);
  }
  if (left.length > 0) localStorage.setItem(LEGACY_SAVED_BANDS_KEY, JSON.stringify(left));
  else localStorage.removeItem(LEGACY_SAVED_BANDS_KEY);
  return moved;
}
