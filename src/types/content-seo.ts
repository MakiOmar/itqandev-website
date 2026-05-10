/**
 * Admin SEO form + API row shape (per locale) for morph `seo_metas`.
 */

export interface ContentSeoMetaRow {
  id?: number;
  locale: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
  /** Laravel JSON column; object or array */
  schema?: unknown;
}

/** Form state for PUT /v1/seo/{type}/{id} */
export interface ContentSeoDraft {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  twitter_card: string;
  schema_json: string;
}

export function emptyContentSeoDraft(): ContentSeoDraft {
  return {
    meta_title: '',
    meta_description: '',
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_card: '',
    schema_json: '',
  };
}

/** Parse JSON from form `seo_draft_json` (route actions). */
export function parseContentSeoDraftFromJson(raw: string): ContentSeoDraft | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const d = emptyContentSeoDraft();
    return {
      meta_title: typeof o.meta_title === 'string' ? o.meta_title : d.meta_title,
      meta_description: typeof o.meta_description === 'string' ? o.meta_description : d.meta_description,
      canonical_url: typeof o.canonical_url === 'string' ? o.canonical_url : d.canonical_url,
      og_title: typeof o.og_title === 'string' ? o.og_title : d.og_title,
      og_description: typeof o.og_description === 'string' ? o.og_description : d.og_description,
      og_image: typeof o.og_image === 'string' ? o.og_image : d.og_image,
      twitter_card: typeof o.twitter_card === 'string' ? o.twitter_card : d.twitter_card,
      schema_json: typeof o.schema_json === 'string' ? o.schema_json : d.schema_json,
    };
  } catch {
    return null;
  }
}

function schemaToJsonString(schema: unknown): string {
  if (schema === null || schema === undefined) {
    return '';
  }
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return '';
  }
}

export function contentSeoDraftFromRow(row: Partial<ContentSeoMetaRow> | null | undefined): ContentSeoDraft {
  if (!row || typeof row !== 'object') {
    return emptyContentSeoDraft();
  }
  return {
    meta_title: typeof row.meta_title === 'string' ? row.meta_title : '',
    meta_description: typeof row.meta_description === 'string' ? row.meta_description : '',
    canonical_url: typeof row.canonical_url === 'string' ? row.canonical_url : '',
    og_title: typeof row.og_title === 'string' ? row.og_title : '',
    og_description: typeof row.og_description === 'string' ? row.og_description : '',
    og_image: typeof row.og_image === 'string' ? row.og_image : '',
    twitter_card: typeof row.twitter_card === 'string' ? row.twitter_card : '',
    schema_json: schemaToJsonString(row.schema),
  };
}

/** Parse JSON-LD / schema array for API; returns undefined when empty/invalid. */
export function seoDraftToMetaRow(locale: string, draft: ContentSeoDraft): ContentSeoMetaRow {
  let schema: unknown;
  try {
    if (draft.schema_json.trim()) {
      schema = JSON.parse(draft.schema_json);
    }
  } catch {
    schema = undefined;
  }
  return {
    locale: locale.toLowerCase().trim(),
    meta_title: draft.meta_title || null,
    meta_description: draft.meta_description || null,
    canonical_url: draft.canonical_url.trim() || null,
    og_title: draft.og_title || null,
    og_description: draft.og_description || null,
    og_image: draft.og_image.trim() || null,
    twitter_card: draft.twitter_card.trim() || null,
    schema,
  };
}

export function parseSchemaJsonField(raw: string): Record<string, unknown> | unknown[] | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const parsed = JSON.parse(t) as unknown;
  if (parsed === null) {
    return undefined;
  }
  if (typeof parsed === 'object') {
    return parsed as Record<string, unknown> | unknown[];
  }
  throw new Error('Schema JSON must be an object or array');
}
