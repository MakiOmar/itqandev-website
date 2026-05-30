import { getApiClient } from '../api/client';

export interface MeUpdatePayload {
  name: string;
  email: string;
}

export interface MePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

function formatApiError(err: unknown): string {
  const e = err as { message?: string; status?: number; errors?: Record<string, string[] | string> };
  const base = String(e?.message ?? 'Request failed');
  if (e?.status === 422 && e.errors && typeof e.errors === 'object') {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(e.errors)) {
      if (Array.isArray(v)) {
        for (const m of v) {
          lines.push(`${k}: ${m}`);
        }
      } else if (v != null) {
        lines.push(`${k}: ${String(v)}`);
      }
    }
    if (lines.length > 0) {
      return `${base} — ${lines.slice(0, 6).join('; ')}`.slice(0, 600);
    }
  }
  return base.slice(0, 400);
}

export async function runMeUpdateFromBrowser(payload: MeUpdatePayload) {
  const client = getApiClient(null);
  try {
    const res = await client.patch<{ user?: unknown }>('/me', payload);
    const body = res.data as { user?: unknown };
    return { success: true as const, user: body?.user };
  } catch (err) {
    return { success: false as const, error: formatApiError(err) };
  }
}

export async function runMePasswordUpdateFromBrowser(payload: MePasswordPayload) {
  const client = getApiClient(null);
  try {
    await client.put('/me/password', payload);
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: formatApiError(err) };
  }
}
