import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { ensurePageLayoutBands } from './page-layout';
import { formatAppearanceError } from './appearance-actions';
import type { PageSectionNode } from '../marketing/appearance-types';
import type {
  ChromeLayoutKind,
  ChromeLayoutMeta,
  ChromeLayoutStatus,
  ChromeTypeDefaults,
} from '../../types/chrome-layout';

function listEndpoint(kind: ChromeLayoutKind): string {
  return kind === 'header' ? API_ENDPOINTS.APPEARANCE.HEADERS : API_ENDPOINTS.APPEARANCE.FOOTERS;
}

function itemEndpoint(kind: ChromeLayoutKind, id: string | number): string {
  return kind === 'header'
    ? API_ENDPOINTS.APPEARANCE.HEADER_GET(id)
    : API_ENDPOINTS.APPEARANCE.FOOTER_GET(id);
}

function setDefaultEndpoint(kind: ChromeLayoutKind, id: string | number): string {
  return kind === 'header'
    ? API_ENDPOINTS.APPEARANCE.HEADER_SET_DEFAULT(id)
    : API_ENDPOINTS.APPEARANCE.FOOTER_SET_DEFAULT(id);
}

function mapLayout(raw: Record<string, unknown>): ChromeLayoutMeta {
  const sections = Array.isArray(raw.sections)
    ? (raw.sections as PageSectionNode[])
    : Array.isArray((raw.document as { sections?: unknown })?.sections)
      ? ((raw.document as { sections: PageSectionNode[] }).sections)
      : undefined;

  return {
    id: Number(raw.id),
    kind: (raw.kind === 'footer' ? 'footer' : 'header') as ChromeLayoutKind,
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    status: (raw.status === 'published' ? 'published' : 'draft') as ChromeLayoutStatus,
    is_site_default: Boolean(raw.is_site_default),
    created_at: (raw.created_at as string) ?? null,
    updated_at: (raw.updated_at as string) ?? null,
    sections,
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
