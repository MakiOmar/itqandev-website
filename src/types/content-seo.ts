/**
 * Admin SEO form + API row shape (per locale) for morph `seo_metas`.
 */

/** JSON value safe for Qwik serialization in $ / useTask$ / useVisibleTask$ closures. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

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
  /** Laravel JSON column; JSON-LD object or array */
  schema?: JsonValue;
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

/**
 * Strip HTML and collapse whitespace. If `maxLen` is a positive number, truncate with a soft word break.
 */
export function stripHtmlToPlainSnippet(raw: string, maxLen?: number): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  let t = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cap = maxLen != null && maxLen > 0 ? maxLen : 0;
  if (cap > 0 && t.length > cap) {
    t = t.slice(0, cap).trimEnd();
    const lastSpace = t.lastIndexOf(' ');
    if (lastSpace > cap * 0.55) {
      t = t.slice(0, lastSpace);
    }
    t = `${t}…`;
  }
  return t;
}

export type ContentSeoAutofillSources = {
  title?: string | null;
  /** First non-empty candidate wins (e.g. excerpt then body). May be HTML. */
  descriptionCandidates?: Array<string | null | undefined>;
  imageUrl?: string | null;
};

const META_DESC_LEN = 160;
const OG_DESC_LEN = 200;

/**
 * Fill only **empty** SEO fields from primary content (title, text snippets, optional image).
 * Does not overwrite operator-entered SEO.
 */
export function mergeContentSeoDraftFromContent(
  draft: ContentSeoDraft,
  sources: ContentSeoAutofillSources,
): ContentSeoDraft {
  const title = (sources.title ?? '').trim();
  const next = { ...draft };

  let plainFromContent = '';
  const cands = sources.descriptionCandidates ?? [];
  for (const c of cands) {
    const p = stripHtmlToPlainSnippet(String(c ?? ''), undefined);
    if (p) {
      plainFromContent = p;
      break;
    }
  }

  const metaDescFill =
    plainFromContent.length > 0 ? stripHtmlToPlainSnippet(plainFromContent, META_DESC_LEN) : '';
  const ogDescFill =
    plainFromContent.length > 0 ? stripHtmlToPlainSnippet(plainFromContent, OG_DESC_LEN) : '';

  if (!next.meta_title.trim() && title) {
    next.meta_title = title;
  }
  if (!next.meta_description.trim() && metaDescFill) {
    next.meta_description = metaDescFill;
  }

  const resolvedTitle = next.meta_title.trim() || title;
  if (!next.og_title.trim() && resolvedTitle) {
    next.og_title = resolvedTitle;
  }

  const resolvedDesc = next.meta_description.trim() || ogDescFill;
  if (!next.og_description.trim() && resolvedDesc) {
    next.og_description = resolvedDesc;
  }

  const img = (sources.imageUrl ?? '').trim();
  if (!next.og_image.trim() && img) {
    next.og_image = img;
  }

  return next;
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

function schemaToJsonString(schema: JsonValue | undefined): string {
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
  let schema: JsonValue | undefined;
  try {
    if (draft.schema_json.trim()) {
      schema = JSON.parse(draft.schema_json) as JsonValue;
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

export function parseSchemaJsonField(raw: string): JsonValue | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const parsed = JSON.parse(t) as JsonValue;
  if (parsed === null) {
    return undefined;
  }
  if (typeof parsed === 'object') {
    return parsed;
  }
  throw new Error('Schema JSON must be an object or array');
}
