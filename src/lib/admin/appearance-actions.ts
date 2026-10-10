import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  AppearanceRegistryEntry,
  ChromeBuilderDocument,
  HomepageSectionInstance,
  PageSectionNode,
} from '../marketing/appearance-types';
import type { FormActionRegistryEntry, FormFieldRegistryEntry } from '../../types/form';
import { appearanceMediaId } from './appearance-media-ref';
import type { ContentTypeInfo } from './content-types';
import { ensurePageLayoutBands } from './page-layout';

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

export type DynamicTagKind = 'text' | 'url' | 'image' | 'html' | 'date' | 'number';

/** Allowlisted `{{id}}` token from DynamicTagRegistry. */
export type DynamicTag = { id: string; group: string; label: string; kind?: DynamicTagKind };

export type DynamicTagScope = 'site' | 'record' | 'archive';

/** Dropdown heading; content type groups nest their relation subgroups via `parent`. */
export type DynamicTagGroup = {
  id: string;
  label: string;
  parent: string | null;
  scope: DynamicTagScope;
  content_type: string | null;
};

/** Tags plus the groups that organise them, as passed down to builder inputs. */
export type DynamicTagCatalog = { tags: DynamicTag[]; groups: DynamicTagGroup[] };

export const EMPTY_DYNAMIC_TAG_CATALOG: DynamicTagCatalog = { tags: [], groups: [] };

type AppearanceRegistries = {
  widgets: AppearanceRegistryEntry[];
  kits: AppearanceRegistryEntry[];
  homepage_sections: AppearanceRegistryEntry[];
  form_fields: FormFieldRegistryEntry[];
  form_actions: FormActionRegistryEntry[];
  dynamic_tags: DynamicTag[];
  dynamic_tag_groups: DynamicTagGroup[];
  content_types: ContentTypeInfo[];
};

export async function fetchAppearanceRegistriesFromBrowser(): Promise<AppearanceRegistries> {
  const api = getApiClient(null);
  const res = await api.get<Partial<AppearanceRegistries>>(API_ENDPOINTS.APPEARANCE.REGISTRIES);
  const kits = res.data?.kits ?? res.data?.homepage_sections ?? [];
  const widgets = res.data?.widgets ?? [];
  return {
    widgets,
    kits,
    homepage_sections: res.data?.homepage_sections ?? kits,
    form_fields: res.data?.form_fields ?? [],
    form_actions: res.data?.form_actions ?? [],
    dynamic_tags: res.data?.dynamic_tags ?? [],
    dynamic_tag_groups: res.data?.dynamic_tag_groups ?? [],
    content_types: res.data?.content_types ?? [],
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
  sections: PageSectionNode[],
): Promise<{ success: boolean; message?: string; error?: string; data?: { sections: PageSectionNode[] } }> {
  try {
    const api = getApiClient(null);
    const res = await api.put<{ sections: PageSectionNode[] }>(
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

export async function fetchFooterBuilderFromBrowser(): Promise<ChromeBuilderDocument> {
  const api = getApiClient(null);
  const res = await api.get<ChromeBuilderDocument>(API_ENDPOINTS.APPEARANCE.FOOTER);
  const sections = ensurePageLayoutBands((res.data?.sections ?? []) as PageSectionNode[]);
  return { sections };
}

export async function saveFooterBuilderFromBrowser(
  doc: ChromeBuilderDocument,
): Promise<{ success: boolean; message?: string; error?: string; data?: ChromeBuilderDocument }> {
  try {
    const api = getApiClient(null);
    const res = await api.put<ChromeBuilderDocument>(API_ENDPOINTS.APPEARANCE.FOOTER, {
      sections: doc.sections,
    });
    return {
      success: true,
      message: (res as { message?: string }).message || 'Footer layout saved.',
      data: res.data,
    };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}

export async function fetchHeaderBuilderFromBrowser(): Promise<ChromeBuilderDocument> {
  const api = getApiClient(null);
  const res = await api.get<ChromeBuilderDocument>(API_ENDPOINTS.APPEARANCE.HEADER);
  const sections = ensurePageLayoutBands((res.data?.sections ?? []) as PageSectionNode[]);
  return { sections };
}

export async function saveHeaderBuilderFromBrowser(
  doc: ChromeBuilderDocument,
): Promise<{ success: boolean; message?: string; error?: string; data?: ChromeBuilderDocument }> {
  try {
    const api = getApiClient(null);
    const res = await api.put<ChromeBuilderDocument>(API_ENDPOINTS.APPEARANCE.HEADER, {
      sections: doc.sections,
    });
    return {
      success: true,
      message: (res as { message?: string }).message || 'Header layout saved.',
      data: res.data,
    };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}

export function newSectionId(type: string): string {
  return `sec_${type}_${Math.random().toString(36).slice(2, 10)}`;
}

export { newBlockId, newColumnId } from './builder-ids';

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Resolve media library URLs for builder preview after reload (settings store ids only).
 */
export async function hydrateAppearanceMediaPreviews(
  ids: number[],
  existing: Record<string, string> = {},
): Promise<Record<string, string>> {
  const unique = Array.from(
    new Set(
      ids
        .map((id) => appearanceMediaId(id))
        .filter((id): id is number => id !== null),
    ),
  ).filter((id) => !existing[String(id)]?.trim());

  if (unique.length === 0) {
    return { ...existing };
  }

  const api = getApiClient(null);
  const next = { ...existing };
  await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await api.get<{
          url?: string;
          thumbnailUrl?: string;
          thumbnail_url?: string;
        }>(API_ENDPOINTS.MEDIA.GET(id));
        const payload =
          (res as { data?: { url?: string; thumbnailUrl?: string; thumbnail_url?: string } }).data ??
          (res as unknown as { url?: string; thumbnailUrl?: string; thumbnail_url?: string });
        const url = payload?.url || payload?.thumbnailUrl || payload?.thumbnail_url || '';
        if (url) {
          next[String(id)] = url;
        }
      } catch {
        /* keep #id placeholder until a successful fetch */
      }
    }),
  );
  return next;
}
