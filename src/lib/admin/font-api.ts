import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { FontFileFormat, FontFormData, SiteFont } from '../../types/font';

function mapFont(raw: Record<string, unknown>): SiteFont {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    css_family: String(raw.css_family ?? ''),
    file_woff2: (raw.file_woff2 as string | null) ?? null,
    file_woff: (raw.file_woff as string | null) ?? null,
    file_ttf: (raw.file_ttf as string | null) ?? null,
    file_eot: (raw.file_eot as string | null) ?? null,
    file_svg: (raw.file_svg as string | null) ?? null,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

export function extractFontsList(response: unknown): SiteFont[] {
  const body = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(body)) {
    return body.map((row) => mapFont(row as Record<string, unknown>));
  }
  if (
    body &&
    typeof body === 'object' &&
    'data' in (body as object) &&
    Array.isArray((body as { data: unknown }).data)
  ) {
    return (body as { data: Record<string, unknown>[] }).data.map((row) => mapFont(row));
  }
  return [];
}

export async function listFonts(cookieHeader?: string | null, search?: string): Promise<SiteFont[]> {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}&per_page=100` : '?per_page=100';
  const api = getApiClient(cookieHeader ?? undefined);
  const res = await api.get<unknown>(`${API_ENDPOINTS.FONTS.LIST}${q}`);
  return extractFontsList(res);
}

function unwrapRecord(payload: unknown): Record<string, unknown> | null {
  const body = (payload as { data?: unknown })?.data ?? payload;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}

export async function getFont(id: number | string, cookieHeader?: string | null): Promise<SiteFont | null> {
  const api = getApiClient(cookieHeader ?? undefined);
  const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.FONTS.GET(id));
  const raw = unwrapRecord(res);
  if (!raw || raw.id == null) {
    return null;
  }
  return mapFont(raw);
}

export function fontPayloadFromForm(data: FontFormData): Record<string, string> {
  const body: Record<string, string> = {
    name: data.name.trim(),
    css_family: data.css_family.trim(),
  };
  for (const fmt of ['woff2', 'woff', 'ttf', 'eot', 'svg'] as const) {
    const key = `file_${fmt}` as keyof FontFormData;
    const val = String(data[key] ?? '').trim();
    if (val) {
      body[key] = val;
    }
  }
  return body;
}

export async function createFont(data: FontFormData, cookieHeader?: string | null): Promise<SiteFont> {
  const api = getApiClient(cookieHeader ?? undefined);
  const res = await api.post<{ data?: Record<string, unknown> }>(
    API_ENDPOINTS.FONTS.CREATE,
    fontPayloadFromForm(data),
  );
  const raw = (res as { data?: Record<string, unknown> })?.data ?? res;
  return mapFont(raw as Record<string, unknown>);
}

export async function updateFont(
  id: number | string,
  data: FontFormData,
  cookieHeader?: string | null,
): Promise<SiteFont> {
  const api = getApiClient(cookieHeader ?? undefined);
  const res = await api.put<{ data?: Record<string, unknown> }>(
    API_ENDPOINTS.FONTS.UPDATE(id),
    fontPayloadFromForm(data),
  );
  const raw = (res as { data?: Record<string, unknown> })?.data ?? res;
  return mapFont(raw as Record<string, unknown>);
}

export async function deleteFont(id: number | string, cookieHeader?: string | null): Promise<void> {
  const api = getApiClient(cookieHeader ?? undefined);
  await api.delete(API_ENDPOINTS.FONTS.DELETE(id));
}

export async function uploadFontFile(
  file: File,
  format: FontFileFormat,
  cookieHeader?: string | null,
): Promise<string> {
  const api = getApiClient(cookieHeader ?? undefined);
  const form = new FormData();
  form.append('file', file);
  form.append('format', format);
  const res = await api.post<{ url?: string }>(API_ENDPOINTS.FONTS.UPLOAD, form);
  const url = res.data?.url;
  if (!url) {
    throw new Error('Upload failed: no URL returned');
  }
  return url;
}
