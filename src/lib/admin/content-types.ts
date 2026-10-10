import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { translateApp } from '../i18n/translate-app';

/** Chrome / theme context that is not a registry content type. */
export const HOMEPAGE_CONTENT_TYPE = 'homepage';

export type ContentTypeArchive = { context: string; page_slug: string; label: string };

/** One entry of `content_types` in GET /appearance/registries (backend config/content-types.php). */
export type ContentTypeInfo = {
  key: string;
  label: string;
  plural_label: string;
  loop_source: string | null;
  archive: ContentTypeArchive | null;
};

function translateOr(lang: string | undefined, key: string, fallback: string): string {
  const translated = translateApp(lang, key);
  return translated !== key ? translated : fallback;
}

/** Singular label: `contentTypes.<key>`, else the API label. */
export function contentTypeLabel(lang: string | undefined, type: Pick<ContentTypeInfo, 'key' | 'label'>): string {
  return translateOr(lang, `contentTypes.${type.key}`, type.label);
}

/** Plural label: `contentTypes.plural.<key>`, else the API plural label. */
export function contentTypePluralLabel(
  lang: string | undefined,
  type: Pick<ContentTypeInfo, 'key' | 'plural_label'>,
): string {
  return translateOr(lang, `contentTypes.plural.${type.key}`, type.plural_label);
}

/** Archive (listing) label: `contentTypes.archives.<context>`, else the API archive label. */
export function contentTypeArchiveLabel(lang: string | undefined, archive: ContentTypeArchive): string {
  return translateOr(lang, `contentTypes.archives.${archive.context}`, archive.label);
}

export function homepageLabel(lang: string | undefined): string {
  return translateOr(lang, `contentTypes.${HOMEPAGE_CONTENT_TYPE}`, 'Homepage');
}

export async function fetchContentTypesFromBrowser(): Promise<ContentTypeInfo[]> {
  const api = getApiClient(null);
  const res = await api.get<{ content_types?: ContentTypeInfo[] }>(API_ENDPOINTS.APPEARANCE.REGISTRIES);
  return res.data?.content_types ?? [];
}

export type PreviewRecordOption = { id: number; title: string };

/** Latest records of a content type for the builder "Preview as" picker. */
export async function fetchPreviewRecordsFromBrowser(contentType: string): Promise<PreviewRecordOption[]> {
  const api = getApiClient(null);
  const res = await api.get<PreviewRecordOption[] | { data?: PreviewRecordOption[] }>(
    API_ENDPOINTS.APPEARANCE.PREVIEW_RECORDS(contentType),
  );
  // The client only unwraps `{ data: {...} }` objects; array payloads arrive still enveloped.
  const body = res.data;
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.data) ? body.data : [];
}
