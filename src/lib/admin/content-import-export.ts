import { getConfig } from '../config';

export type ContentImportMode = 'upsert' | 'translation_only';

export type ContentImportResult = {
  mode: string;
  locale: string;
  entity?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id?: number | null; slug: string; message: string }>;
};

const CONTENT_EXPORT_FORMAT = 'credocode.content-export';

/**
 * Align envelope locale with the admin content locale (URL / X-Content-Locale).
 * Lets operators export in one language and import on another route without hand-editing JSON.
 */
export function alignContentExportEnvelopeLocale(payload: unknown, targetLocale: string): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const envelope = payload as Record<string, unknown>;
  if (envelope.format !== CONTENT_EXPORT_FORMAT) {
    return payload;
  }

  const target = String(targetLocale || '').toLowerCase().trim();
  if (target === '') {
    return payload;
  }

  const fileLocale = String(envelope.locale ?? '').toLowerCase().trim();
  if (fileLocale === target) {
    return payload;
  }

  return { ...envelope, locale: target };
}

function getBearerToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const config = getConfig();
  const session = localStorage.getItem(config.auth.cookieName);
  if (!session) {
    return null;
  }
  try {
    const parsed = JSON.parse(session);
    if (parsed.token && parsed.token !== 'sanctum_cookie') {
      return parsed.token;
    }
  } catch {
    if (session !== 'sanctum_cookie') {
      return session;
    }
  }
  return null;
}

async function contentLocaleFetch(
  endpoint: string,
  locale: string,
  init: RequestInit = {},
): Promise<Response> {
  const config = getConfig();
  const url = `${config.api.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Content-Locale': locale,
    ...(init.headers as Record<string, string> | undefined),
  };

  const token = getBearerToken();
  if (token) {
    headers[config.auth.tokenHeader] = `Bearer ${token}`;
  }

  return fetch(url, {
    credentials: config.api.sanctum ? 'include' : 'same-origin',
    ...init,
    headers,
  });
}

function triggerJsonDownload(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function parseErrorMessage(text: string, status: number, fallback: string): string {
  try {
    const body = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> };
    if (body.message) {
      return body.message;
    }
    if (body.errors) {
      const first = Object.values(body.errors).flat()[0];
      if (first) {
        return first;
      }
    }
  } catch {
    // keep fallback
  }

  return `${fallback} (${status})`;
}

/**
 * Download locale export JSON for a translatable admin entity.
 */
export async function exportContentJson(
  exportEndpoint: string,
  filePrefix: string,
  locale: string,
  ids?: string[],
): Promise<void> {
  let endpoint = exportEndpoint;
  if (ids && ids.length > 0) {
    const params = new URLSearchParams();
    for (const id of ids) {
      params.append('ids[]', id);
    }
    endpoint = `${endpoint}?${params.toString()}`;
  }

  const response = await contentLocaleFetch(endpoint, locale, { method: 'GET' });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Export failed'));
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Export response was not valid JSON.');
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  triggerJsonDownload(`${filePrefix}-${locale}-${stamp}.json`, payload);
}

/**
 * Import locale export JSON for a translatable admin entity.
 */
export async function importContentJson(
  importEndpoint: string,
  locale: string,
  payload: unknown,
  mode: ContentImportMode,
): Promise<ContentImportResult> {
  const alignedPayload = alignContentExportEnvelopeLocale(payload, locale);
  const query = mode === 'translation_only' ? '?mode=translation_only' : '';
  const response = await contentLocaleFetch(`${importEndpoint}${query}`, locale, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alignedPayload),
  });

  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Import response was not valid JSON.');
  }

  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Import failed'));
  }

  return body as ContentImportResult;
}
