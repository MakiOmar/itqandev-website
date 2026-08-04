import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export type RunProjectDeleteResult = { ok: true } | { ok: false; message: string };

function normalizeProjectIds(ids: Array<string | number>): number[] {
  return ids
    .map((id) => Number(id))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** Browser delete (Sanctum cookies + CSRF) — avoids routeAction false-success. */
export async function runProjectDeleteFromBrowser(id: string | number): Promise<RunProjectDeleteResult> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, message: 'Missing project id' };
  }
  try {
    await getApiClient(null).delete(API_ENDPOINTS.PROJECTS.DELETE(String(numericId)));
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete project';
    return { ok: false, message };
  }
}

/** Browser bulk delete — sends integer ids matching Laravel validation. */
export async function runProjectBulkDeleteFromBrowser(
  ids: Array<string | number>,
): Promise<RunProjectDeleteResult> {
  const numericIds = normalizeProjectIds(ids);
  if (numericIds.length === 0) {
    return { ok: false, message: 'No projects selected' };
  }
  try {
    await getApiClient(null).post(API_ENDPOINTS.PROJECTS.BULK_DELETE, { ids: numericIds });
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete projects';
    return { ok: false, message };
  }
}
