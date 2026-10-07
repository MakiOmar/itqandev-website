import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export type AdminUserStatus = 'active' | 'inactive';

export interface AdminRole {
  id: number;
  name: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  status: AdminUserStatus;
  roles: AdminRole[];
  createdAt: string;
}

export interface UserFormInput {
  name: string;
  email: string;
  password: string;
  status: AdminUserStatus;
  roleIds: number[];
}

type ApiClientLike = ReturnType<typeof getApiClient>;

export type UserActionResult = { ok: true } | { ok: false; message: string };
export type UserBulkResult = { ok: true; count: number } | { ok: false; message: string };

/** Users list is small; one page of the API maximum keeps client-side search simple. */
export const USERS_LIST_PATH = `${API_ENDPOINTS.USERS.LIST}?per_page=100`;

export function mapUserFromApi(raw: Record<string, unknown>): AdminUser {
  const roles = Array.isArray(raw.roles)
    ? (raw.roles as Record<string, unknown>[])
        .filter((r) => r && r.id != null)
        .map((r) => ({ id: Number(r.id), name: String(r.name ?? '') }))
    : [];
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    roles,
    createdAt: String(raw.created_at ?? ''),
  };
}

/** Accepts `{ data: [...] }`, a bare array, or a Laravel paginator. */
export function extractRows(response: unknown): Record<string, unknown>[] {
  const body = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  const inner = (body as { data?: unknown })?.data;
  return Array.isArray(inner) ? (inner as Record<string, unknown>[]) : [];
}

export async function loadUsers(apiClient: ApiClientLike): Promise<AdminUser[]> {
  const res = await apiClient.get(USERS_LIST_PATH);
  return extractRows(res).map(mapUserFromApi);
}

export async function loadRoles(apiClient: ApiClientLike): Promise<AdminRole[]> {
  const res = await apiClient.get(API_ENDPOINTS.USERS.ROLES);
  return extractRows(res).map((r) => ({ id: Number(r.id), name: String(r.name ?? '') }));
}

export async function loadUser(apiClient: ApiClientLike, id: string): Promise<AdminUser | null> {
  const res = await apiClient.get(API_ENDPOINTS.USERS.GET(id));
  const raw = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown> | null;
  return raw && raw.id != null ? mapUserFromApi(raw) : null;
}

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { message?: string })?.message;
  return message && message.trim() ? message : fallback;
}

function toIds(ids: (string | number)[]): number[] {
  return ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
}

export async function runUserSaveFromBrowser(
  id: number | null,
  input: UserFormInput,
): Promise<UserActionResult> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email.trim(),
    status: input.status,
    role_ids: input.roleIds,
  };
  if (input.password) {
    payload.password = input.password;
  }
  try {
    const client = getApiClient(null);
    if (id) {
      await client.put(API_ENDPOINTS.USERS.UPDATE(String(id)), payload);
    } else {
      await client.post(API_ENDPOINTS.USERS.CREATE, payload);
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: errorMessage(err, 'Failed to save user') };
  }
}

export async function runUserDeleteFromBrowser(id: number): Promise<UserActionResult> {
  try {
    await getApiClient(null).delete(API_ENDPOINTS.USERS.DELETE(String(id)));
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: errorMessage(err, 'Failed to delete user') };
  }
}

export async function runUserBulkDeleteFromBrowser(ids: (string | number)[]): Promise<UserBulkResult> {
  const numericIds = toIds(ids);
  if (numericIds.length === 0) return { ok: false, message: 'No users selected' };
  try {
    const res = (await getApiClient(null).post(API_ENDPOINTS.USERS.BULK_DELETE, { ids: numericIds })) as {
      data?: { deleted?: number };
    };
    return { ok: true, count: Number(res?.data?.deleted ?? numericIds.length) };
  } catch (err: unknown) {
    return { ok: false, message: errorMessage(err, 'Failed to delete users') };
  }
}

export async function runUserBulkStatusFromBrowser(
  ids: (string | number)[],
  status: AdminUserStatus,
): Promise<UserBulkResult> {
  const numericIds = toIds(ids);
  if (numericIds.length === 0) return { ok: false, message: 'No users selected' };
  try {
    const res = (await getApiClient(null).post(API_ENDPOINTS.USERS.BULK_STATUS, {
      ids: numericIds,
      status,
    })) as { data?: { updated?: number } };
    return { ok: true, count: Number(res?.data?.updated ?? numericIds.length) };
  } catch (err: unknown) {
    return { ok: false, message: errorMessage(err, 'Failed to update users') };
  }
}
