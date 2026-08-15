import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { formatAppearanceError } from './appearance-actions';
import type {
  ThemeTemplateConditionsDoc,
  ThemeTemplateMeta,
  ThemeTemplateStatus,
} from '../../types/chrome-layout';

function mapTemplate(raw: Record<string, unknown>): ThemeTemplateMeta {
  const conditionsRaw = raw.conditions;
  let conditions: ThemeTemplateConditionsDoc = {
    relation: 'and',
    rules: [{ include: true, group: 'entire', key: 'site', value: null }],
  };
  if (conditionsRaw && typeof conditionsRaw === 'object' && !Array.isArray(conditionsRaw)) {
    const c = conditionsRaw as Record<string, unknown>;
    const rules = Array.isArray(c.rules) ? c.rules : [];
    conditions = {
      relation: c.relation === 'or' ? 'or' : 'and',
      rules: rules
        .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
        .map((r) => ({
          include: r.include !== false,
          group: (['entire', 'singular', 'archive', 'advanced'].includes(String(r.group))
            ? String(r.group)
            : 'entire') as ThemeTemplateConditionsDoc['rules'][0]['group'],
          key: String(r.key || 'site'),
          value: (r.value as string | number | null) ?? null,
        })),
    };
    if (conditions.rules.length === 0) {
      conditions.rules = [{ include: true, group: 'entire', key: 'site', value: null }];
    }
  }

  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    status: (raw.status === 'published' ? 'published' : 'draft') as ThemeTemplateStatus,
    conditions,
    header_layout_id: raw.header_layout_id != null ? Number(raw.header_layout_id) : null,
    footer_layout_id: raw.footer_layout_id != null ? Number(raw.footer_layout_id) : null,
    body_layout_id: raw.body_layout_id != null ? Number(raw.body_layout_id) : null,
    created_at: (raw.created_at as string) ?? null,
    updated_at: (raw.updated_at as string) ?? null,
  };
}

function normalizeList(body: unknown): ThemeTemplateMeta[] {
  if (Array.isArray(body)) {
    return body.map((x) => mapTemplate(x as Record<string, unknown>));
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return ((body as { data: unknown[] }).data).map((x) => mapTemplate(x as Record<string, unknown>));
  }
  return [];
}

export async function fetchThemeTemplatesFromBrowser(): Promise<ThemeTemplateMeta[]> {
  const api = getApiClient(null);
  const res = await api.get(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATES);
  return normalizeList((res as { data?: unknown })?.data ?? res);
}

export async function fetchThemeTemplateFromBrowser(id: string | number): Promise<ThemeTemplateMeta> {
  const api = getApiClient(null);
  const res = await api.get(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATE_GET(id));
  const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
  return mapTemplate(body);
}

export async function createThemeTemplateFromBrowser(payload: {
  name: string;
  status?: ThemeTemplateStatus;
  conditions?: ThemeTemplateConditionsDoc;
  header_layout_id?: number | null;
  footer_layout_id?: number | null;
  body_layout_id?: number | null;
}): Promise<{ success: boolean; id?: number; error?: string; data?: ThemeTemplateMeta }> {
  try {
    const api = getApiClient(null);
    const res = await api.post(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATES, payload);
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    const data = mapTemplate(body);
    return { success: true, id: data.id, data };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function updateThemeTemplateFromBrowser(
  id: string | number,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string; data?: ThemeTemplateMeta }> {
  try {
    const api = getApiClient(null);
    const res = await api.put(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATE_GET(id), payload);
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return {
      success: true,
      message: (res as { message?: string }).message,
      data: mapTemplate(body),
    };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export async function deleteThemeTemplateFromBrowser(
  id: string | number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = getApiClient(null);
    await api.delete(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATE_GET(id));
    return { success: true };
  } catch (err) {
    return { success: false, error: formatAppearanceError(err) };
  }
}

export function emptyThemeConditions(): ThemeTemplateConditionsDoc {
  return {
    relation: 'and',
    rules: [{ include: true, group: 'entire', key: 'site', value: null }],
  };
}

/** True when conditions can apply a body layout (homepage / 404). */
export function themeConditionsAllowBody(conditions: ThemeTemplateConditionsDoc): boolean {
  const includes = conditions.rules.filter((r) => r.include);
  if (includes.length === 0) return false;
  return includes.some(
    (r) =>
      (r.group === 'singular' && (r.key === 'homepage' || r.key === 'not_found')) ||
      (r.group === 'entire' && r.key === 'site'),
  );
}

export function summarizeThemeConditions(conditions: ThemeTemplateConditionsDoc): string {
  return conditions.rules
    .map((r) => {
      const op = r.include ? 'Include' : 'Exclude';
      const val = r.value != null && r.value !== '' ? `:${r.value}` : '';
      return `${op} ${r.group}/${r.key}${val}`;
    })
    .join(conditions.relation === 'or' ? ' OR ' : ' AND ');
}
