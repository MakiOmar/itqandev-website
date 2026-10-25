/**
 * Settings → SEO defaults (`seo_defaults` in site-meta / settings).
 * Cascade per head field: item SEO → content → type defaults → global defaults → site basics.
 */

export const SEO_DEFAULTS_TYPES = ['page', 'blog_post', 'project', 'service'] as const;

export type SeoDefaultsType = (typeof SEO_DEFAULTS_TYPES)[number];

export type SeoTwitterCard = '' | 'summary' | 'summary_large_image';

export interface SeoDefaultsBlock {
  title_template: string;
  meta_description: string;
  og_image: string | null;
  twitter_card: SeoTwitterCard;
}

export interface SeoDefaults extends SeoDefaultsBlock {
  /** Public numeric id emitted as `fb:app_id` on every public page (global only). */
  facebook_app_id: string;
  types: Record<SeoDefaultsType, SeoDefaultsBlock>;
}

const FACEBOOK_APP_ID_RE = /^\d{5,20}$/;

/** Trimmed id when it looks like a Facebook App ID, otherwise ''. */
export function parseFacebookAppId(raw: unknown): string {
  const id = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
  return FACEBOOK_APP_ID_RE.test(id) ? id : '';
}

/** Keeps today's `Title | Section | Site` output when nothing is configured. */
export const DEFAULT_TITLE_TEMPLATE = '{title} | {section} | {site}';

export const SEO_TITLE_TEMPLATE_MAX = 160;
export const SEO_DESCRIPTION_MAX = 320;

export function emptySeoDefaultsBlock(): SeoDefaultsBlock {
  return { title_template: '', meta_description: '', og_image: null, twitter_card: '' };
}

export function emptySeoDefaults(): SeoDefaults {
  const types = {} as Record<SeoDefaultsType, SeoDefaultsBlock>;
  for (const type of SEO_DEFAULTS_TYPES) {
    types[type] = emptySeoDefaultsBlock();
  }
  return { ...emptySeoDefaultsBlock(), facebook_app_id: '', types };
}

function parseTwitterCard(raw: unknown): SeoTwitterCard {
  return raw === 'summary' || raw === 'summary_large_image' ? raw : '';
}

function parseBlock(raw: unknown): SeoDefaultsBlock {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptySeoDefaultsBlock();
  }
  const o = raw as Record<string, unknown>;
  const image = typeof o.og_image === 'string' ? o.og_image.trim() : '';
  return {
    title_template: typeof o.title_template === 'string' ? o.title_template : '',
    meta_description: typeof o.meta_description === 'string' ? o.meta_description : '',
    og_image: image !== '' ? image : null,
    twitter_card: parseTwitterCard(o.twitter_card),
  };
}

export function parseSeoDefaults(raw: unknown): SeoDefaults {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : undefined;
  const out: SeoDefaults = {
    ...parseBlock(raw),
    facebook_app_id: parseFacebookAppId(obj?.facebook_app_id),
    types: emptySeoDefaults().types,
  };
  const types = obj?.types;
  if (types && typeof types === 'object' && !Array.isArray(types)) {
    for (const type of SEO_DEFAULTS_TYPES) {
      out.types[type] = parseBlock((types as Record<string, unknown>)[type]);
    }
  }
  return out;
}

export interface ResolvedSeoDefaults {
  titleTemplate: string;
  description: string;
  ogImage: string;
  twitterCard: SeoTwitterCard;
}

/** Type defaults first, then global; `type` null (e.g. addon content) uses global only. */
export function resolveSeoDefaults(
  defaults: SeoDefaults | null | undefined,
  type: SeoDefaultsType | null,
): ResolvedSeoDefaults {
  const global = defaults ?? emptySeoDefaults();
  const typed = type ? global.types?.[type] : undefined;
  const pick = (a: string | null | undefined, b: string | null | undefined): string =>
    (a ?? '').trim() || (b ?? '').trim();
  return {
    titleTemplate: pick(typed?.title_template, global.title_template) || DEFAULT_TITLE_TEMPLATE,
    description: pick(typed?.meta_description, global.meta_description),
    ogImage: pick(typed?.og_image, global.og_image),
    twitterCard: typed?.twitter_card || global.twitter_card || '',
  };
}

const EMPTY_TOKEN = '\u0000';
const SEPARATOR = '[|·•:\\-–—]';

/** Fill `{title}`, `{section}`, `{site}`; an empty token drops itself and one adjacent separator. */
export function applyTitleTemplate(
  template: string,
  values: { title: string; section?: string; site?: string },
): string {
  const tokens: Record<string, string> = {
    title: values.title?.trim() ?? '',
    section: values.section?.trim() ?? '',
    site: values.site?.trim() ?? '',
  };
  let out = (template.trim() || DEFAULT_TITLE_TEMPLATE).replace(
    /\{(title|section|site)\}/g,
    (_, key: string) => tokens[key] || EMPTY_TOKEN,
  );
  out = out.replace(new RegExp(`\\s*${SEPARATOR}\\s*${EMPTY_TOKEN}`, 'g'), '');
  out = out.replace(new RegExp(`${EMPTY_TOKEN}\\s*(?:${SEPARATOR}\\s*)?`, 'g'), '');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out || tokens.title || tokens.site;
}
