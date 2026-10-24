import type { ContentSeoDraft, JsonValue } from '../../types/content-seo';
import { isContentSeoDraftEmpty, parseSchemaJsonField } from '../../types/content-seo';

export type ContentSeoApiType = 'project' | 'blog-post' | 'category' | 'service' | 'skill' | 'page';

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

/**
 * Create screens: store SEO for the new record only when an editor filled something, so empty
 * forms do not create blank rows (public heads then use the content and the SEO defaults).
 *
 * @returns whether a row was saved
 */
export async function putContentSeoIfFilled(
  apiClient: SeoPutClient,
  type: ContentSeoApiType,
  id: number,
  locale: string,
  draft: ContentSeoDraft,
): Promise<boolean> {
  if (isContentSeoDraftEmpty(draft)) {
    return false;
  }
  await putContentSeo(apiClient, type, id, locale, draft);
  return true;
}
