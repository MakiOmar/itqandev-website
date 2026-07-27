import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  AppearanceRegistryEntry,
  FooterBuilderDocument,
  HomepageSectionInstance,
} from '../marketing/appearance-types';

/** Prefer Laravel/ApiError `.message` (plain objects), then Error, then fallback. */
export function formatAppearanceError(err: unknown, fallback = 'Request failed'): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message?: unknown }).message ?? '').trim();
    if (msg) return msg.slice(0, 600);
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.slice(0, 600);
  }
  return fallback;
}

function formatError(err: unknown): string {
  return formatAppearanceError(err);
}

export async function fetchAppearanceRegistriesFromBrowser(): Promise<{
  homepage_sections: AppearanceRegistryEntry[];
  footer_blocks: AppearanceRegistryEntry[];
}> {
  const api = getApiClient(null);
  const res = await api.get<{
    homepage_sections: AppearanceRegistryEntry[];
    footer_blocks: AppearanceRegistryEntry[];
  }>(API_ENDPOINTS.APPEARANCE.REGISTRIES);
  return {
    homepage_sections: res.data?.homepage_sections ?? [],
    footer_blocks: res.data?.footer_blocks ?? [],
  };
}

export async function fetchHomepageBuilderFromBrowser(): Promise<{
  sections: HomepageSectionInstance[];
}> {
  const api = getApiClient(null);
  const res = await api.get<{ sections: HomepageSectionInstance[] }>(
    API_ENDPOINTS.APPEARANCE.HOMEPAGE,
  );
  return { sections: res.data?.sections ?? [] };
}

export async function saveHomepageBuilderFromBrowser(
  sections: HomepageSectionInstance[],
): Promise<{ success: boolean; message?: string; error?: string; data?: { sections: HomepageSectionInstance[] } }> {
  try {
    const api = getApiClient(null);
    const res = await api.put<{ sections: HomepageSectionInstance[] }>(
      API_ENDPOINTS.APPEARANCE.HOMEPAGE,
      { sections },
    );
    return {
      success: true,
      message: (res as { message?: string }).message || 'Homepage layout saved.',
      data: res.data,
    };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}

export async function fetchFooterBuilderFromBrowser(): Promise<FooterBuilderDocument> {
  const api = getApiClient(null);
  const res = await api.get<FooterBuilderDocument>(API_ENDPOINTS.APPEARANCE.FOOTER);
  return (
    res.data ?? {
      mode: 'hardcoded',
      zones: {
        top: { enabled: false, columns: [] },
        main: { enabled: true, columns: [] },
        bottom: { enabled: true, columns: [] },
      },
    }
  );
}

export async function saveFooterBuilderFromBrowser(
  doc: FooterBuilderDocument,
): Promise<{ success: boolean; message?: string; error?: string; data?: FooterBuilderDocument }> {
  try {
    const api = getApiClient(null);
    const res = await api.put<FooterBuilderDocument>(API_ENDPOINTS.APPEARANCE.FOOTER, doc);
    return {
      success: true,
      message: (res as { message?: string }).message || 'Footer layout saved.',
      data: res.data,
    };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}

export function newSectionId(type: string): string {
  return `sec_${type}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newBlockId(type: string): string {
  return `blk_${type}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newColumnId(): string {
  return `col_${Math.random().toString(36).slice(2, 10)}`;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function countByType(items: { type: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  return counts;
}

export function canInsertType(
  type: string,
  counts: Record<string, number>,
  maxInstances: number | null | undefined,
): boolean {
  if (maxInstances == null) return true;
  return (counts[type] ?? 0) < maxInstances;
}
