import type { ContentSeoDraft, JsonValue } from '../../types/content-seo';
import { parseSchemaJsonField } from '../../types/content-seo';

export type ContentSeoApiType = 'project' | 'blog-post' | 'category' | 'service' | 'skill';

/** Minimal API client surface (matches `getApiClient()` result). */
type SeoPutClient = {
  put: (path: string, body: Record<string, unknown>) => Promise<unknown>;
};

/** Body for `PUT /v1/seo/{type}/{id}` (shared by client + server route actions). */
export function buildSeoMorphPutBody(locale: string, draft: ContentSeoDraft): Record<string, unknown> {
  let schema: JsonValue | undefined;
  if (draft.schema_json.trim()) {
    schema = parseSchemaJsonField(draft.schema_json);
  }
  return {
    locale: locale.trim().toLowerCase(),
    meta_title: draft.meta_title || '',
    meta_description: draft.meta_description || '',
    canonical_url: draft.canonical_url.trim() || null,
    og_title: draft.og_title || '',
    og_description: draft.og_description || '',
    og_image: draft.og_image.trim() ? draft.og_image.trim() : null,
    twitter_card: draft.twitter_card.trim() || null,
    schema,
  };
}

export async function putContentSeo(
  apiClient: SeoPutClient,
  type: ContentSeoApiType,
  id: number,
  locale: string,
  draft: ContentSeoDraft,
): Promise<void> {
  await apiClient.put(`/v1/seo/${type}/${id}`, buildSeoMorphPutBody(locale, draft));
}
