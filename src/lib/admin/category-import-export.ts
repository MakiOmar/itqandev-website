import { getConfig } from '../config';
import { API_ENDPOINTS } from '../api/endpoints';

export type CategoryImportMode = 'upsert' | 'translation_only';

export type CategoryImportResult = {
  mode: string;
  locale: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ slug: string; message: string }>;
};

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

/**
 * Download categories export JSON for the given content locale.
 */
export async function exportCategoriesJson(locale: string, ids?: string[]): Promise<void> {
  let endpoint = API_ENDPOINTS.CATEGORIES.EXPORT;
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
    let message = `Export failed (${response.status})`;
    try {
      const body = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> };
      if (body.message) {
        message = body.message;
      } else if (body.errors) {
        const first = Object.values(body.errors).flat()[0];
        if (first) {
          message = first;
        }
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Export response was not valid JSON.');
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  triggerJsonDownload(`categories-${locale}-${stamp}.json`, payload);
}

/**
 * Import categories from a JSON export envelope.
 */
export async function importCategoriesJson(
  locale: string,
  payload: unknown,
  mode: CategoryImportMode,
): Promise<CategoryImportResult> {
  const query = mode === 'translation_only' ? '?mode=translation_only' : '';
  const response = await contentLocaleFetch(`${API_ENDPOINTS.CATEGORIES.IMPORT}${query}`, locale, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Import response was not valid JSON.');
  }

  if (!response.ok) {
    const err = body as { message?: string; errors?: Record<string, string[]> };
    let message = err.message || `Import failed (${response.status})`;
    if (err.errors) {
      const first = Object.values(err.errors).flat()[0];
      if (first) {
        message = first;
      }
    }
    throw new Error(message);
  }

  return body as CategoryImportResult;
}
