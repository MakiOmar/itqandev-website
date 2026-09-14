import { getConfig } from '../config';

export type SearchReplaceTable = {
  name: string;
  string_column_count: number;
};

export type SearchReplaceSample = {
  table: string;
  column: string;
  pk: string | null;
  before: string;
  after: string | null;
};

export type SearchReplaceTableStat = {
  table: string;
  match_count: number;
  replaced_count: number;
  columns_scanned: number;
};

export type SearchReplaceResult = {
  match_count: number;
  replaced_count: number;
  tables: SearchReplaceTableStat[];
  samples: SearchReplaceSample[];
};

export type SearchReplaceTablesResponse = {
  data: SearchReplaceTable[];
  meta: {
    confirm_phrase: string;
    driver: string;
  };
};

async function srFetch(endpoint: string, init: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  const url = `${config.api.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(init.headers as Record<string, string> | undefined),
  };

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

export async function fetchSearchReplaceTablesFromBrowser(): Promise<SearchReplaceTablesResponse> {
  const response = await srFetch('/v1/system/search-replace/tables');
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Failed to load tables'));
  }
  return JSON.parse(text) as SearchReplaceTablesResponse;
}

export async function previewSearchReplaceFromBrowser(input: {
  find: string;
  tables: string[];
  case_sensitive: boolean;
  ignore_slugs: boolean;
}): Promise<SearchReplaceResult> {
  const response = await srFetch('/v1/system/search-replace/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Preview failed'));
  }
  const body = JSON.parse(text) as { data: SearchReplaceResult };
  return body.data;
}

export async function applySearchReplaceFromBrowser(input: {
  find: string;
  replace: string;
  tables: string[];
  case_sensitive: boolean;
  ignore_slugs: boolean;
  confirmation: string;
}): Promise<SearchReplaceResult> {
  const response = await srFetch('/v1/system/search-replace/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(text, response.status, 'Replace failed'));
  }
  const body = JSON.parse(text) as { data: SearchReplaceResult };
  return body.data;
}
