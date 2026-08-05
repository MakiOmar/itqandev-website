import { getConfig } from '../config';

export type DatabaseBackupItem = {
  filename: string;
  size: number;
  created_at: string;
};

export type DatabaseBackupListResponse = {
  data: DatabaseBackupItem[];
  meta: {
    confirm_phrase: string;
    driver: string;
    max_files: number;
    schedule?: {
      interval: string;
      at: string;
      weekly_day: number;
      enabled: boolean;
    };
  };
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

async function backupFetch(endpoint: string, init: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  const url = `${config.api.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(init.headers as Record<string, string> | undefined),
  };

  const token = getBearerToken();
  if (token) {
    headers[config.auth.tokenHeader] = `Bearer ${token}`;
  } else if (typeof document !== 'undefined') {
    // Sanctum cookie sessions need CSRF on mutating requests.
    const method = (init.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const meta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const fromCookie = document.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('XSRF-TOKEN='));
      const csrf = meta || (fromCookie ? decodeURIComponent(fromCookie.slice('XSRF-TOKEN='.length)) : null);
      if (csrf) {
        headers['X-CSRF-TOKEN'] = csrf;
        headers['X-XSRF-TOKEN'] = csrf;
      }
    }
  }

  // Never force Content-Type for FormData — the browser must set the multipart boundary.
  if (init.body instanceof FormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  return fetch(url, {
    credentials: config.api.sanctum ? 'include' : 'same-origin',
    ...init,
    headers,
  });
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

export async function fetchDatabaseBackupsFromBrowser(): Promise<DatabaseBackupListResponse> {
  const response = await backupFetch('/v1/system/backups');
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Failed to load backups'));
  }
  return JSON.parse(text) as DatabaseBackupListResponse;
}

export async function createDatabaseBackupFromBrowser(): Promise<DatabaseBackupItem> {
  const response = await backupFetch('/v1/system/backups', { method: 'POST' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Backup failed'));
  }
  const body = JSON.parse(text) as { data: DatabaseBackupItem };
  return body.data;
}

export async function deleteDatabaseBackupFromBrowser(filename: string): Promise<void> {
  const response = await backupFetch(`/v1/system/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Delete failed'));
  }
}

export async function downloadDatabaseBackupFromBrowser(filename: string): Promise<void> {
  const response = await backupFetch(`/v1/system/backups/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseErrorMessage(text, response.status, 'Download failed'));
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function restoreDatabaseBackupFromBrowser(input: {
  confirmation: string;
  filename?: string;
  file?: File;
}): Promise<void> {
  const form = new FormData();
  form.append('confirmation', input.confirmation);
  if (input.filename) {
    form.append('filename', input.filename);
  }
  if (input.file) {
    form.append('file', input.file);
  }

  const response = await backupFetch('/v1/system/backups/restore', {
    method: 'POST',
    body: form,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Restore failed'));
  }
}

export function formatBackupBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) {
    return '—';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
