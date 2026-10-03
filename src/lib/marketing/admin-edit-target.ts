import {
  createContextId,
  useContext,
  useTask$,
  type ReadonlySignal,
  type Signal,
} from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';

/** The record the current public page renders, so the admin drawer can deep-link to its editor. */
export type AdminEditTarget =
  | { kind: 'page'; id: string | number; title?: string }
  | { kind: 'blog'; id: string | number; title?: string }
  | { kind: 'project'; id: string | number; title?: string }
  | { kind: 'service'; id: string | number; title?: string }
  | { kind: 'homepage' };

/** Target tagged with the pathname that set it; a stale target from the previous page is ignored. */
export type AdminEditTargetState = { path: string; target: AdminEditTarget } | null;

export const AdminEditTargetContext = createContextId<Signal<AdminEditTargetState>>(
  'public.admin-edit-target',
);

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/** Current page's target, or null when it was set by another page. */
export function targetForPath(state: AdminEditTargetState, pathname: string): AdminEditTarget | null {
  if (!state || state.path !== normalizePath(pathname)) return null;
  return state.target;
}

/**
 * Public routes call this with a computed target from their loader. Cheap for visitors: it only
 * writes a context signal; the drawer that reads it renders for dashboard users only.
 */
export function useAdminEditTarget(target: ReadonlySignal<AdminEditTarget | null>): void {
  const state = useContext(AdminEditTargetContext, null);
  const loc = useLocation();
  useTask$(({ track }) => {
    const path = normalizePath(track(() => loc.url.pathname));
    const next = track(() => target.value);
    if (!state) return;
    state.value = next ? { path, target: next } : null;
  });
}

/** Database id from an API row; bundled fallback content uses slug-like ids that have no admin record. */
function recordId(row: { id?: unknown; failed?: boolean }): number | null {
  if (row.failed) return null;
  const id = Number(row.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** CMS page target from a public page payload (returns null for failed / missing loaders). */
export function cmsPageEditTarget(page: unknown): AdminEditTarget | null {
  if (!page || typeof page !== 'object') return null;
  const id = recordId(page as { id?: unknown; failed?: boolean });
  if (id === null) return null;
  return { kind: 'page', id, title: (page as { title?: string }).title };
}

/** Entity target for blog posts, projects and services; null when the payload has no id. */
export function entityEditTarget(
  kind: 'blog' | 'project' | 'service',
  entity: unknown,
): AdminEditTarget | null {
  if (!entity || typeof entity !== 'object') return null;
  const row = entity as { id?: unknown; title?: string; name?: string; failed?: boolean };
  const id = recordId(row);
  if (id === null) return null;
  return { kind, id, title: row.title ?? row.name };
}
