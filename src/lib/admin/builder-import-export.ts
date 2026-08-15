import {
  ensureFormActions,
  ensureFormLayout,
  ensureFormSettings,
} from './form-layout';
import { ensurePageLayoutBands } from './page-layout';
import type {
  ChromeBuilderDocument,
  HomepageSectionInstance,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { FormActionNode, FormLayoutDocument, FormSettings } from '~/types/form';

/** Shared envelope for every admin visual builder (page, form, homepage, header, footer, …). */
export const BUILDER_EXPORT_FORMAT = 'credocode.builder-export';
export const BUILDER_EXPORT_VERSION = 1;

export type BuilderKind = 'page' | 'form' | 'homepage' | 'header' | 'footer' | 'body' | 'theme';


export type BuilderExportEnvelope<T = unknown> = {
  format: typeof BUILDER_EXPORT_FORMAT;
  version: number;
  builder: BuilderKind;
  exported_at: string;
  document: T;
};

export type PageBuilderDocument = { sections: PageSectionNode[] };
export type FormBuilderDocument = {
  layout: FormLayoutDocument;
  actions: FormActionNode[];
  settings: FormSettings;
};
export type HomepageBuilderDocument = { sections: HomepageSectionInstance[] };
export type FooterBuilderExportDocument = ChromeBuilderDocument;
export type HeaderBuilderExportDocument = ChromeBuilderDocument;

export type BuilderImportErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_SHAPE'
  | 'BUILDER_MISMATCH'
  | 'MISSING_DOCUMENT'
  | 'INVALID_PAGE_DOCUMENT'
  | 'INVALID_FORM_DOCUMENT'
  | 'INVALID_HOMEPAGE_DOCUMENT'
  | 'INVALID_FOOTER_DOCUMENT'
  | 'INVALID_HEADER_DOCUMENT'
  | 'INVALID_BODY_DOCUMENT'
  | 'INVALID_THEME_DOCUMENT';

export class BuilderImportError extends Error {
  readonly code: BuilderImportErrorCode;

  constructor(code: BuilderImportErrorCode, message?: string) {
    super(message || code);
    this.name = 'BuilderImportError';
    this.code = code;
  }
}

export function buildBuilderExportEnvelope<T>(
  builder: BuilderKind,
  document: T,
): BuilderExportEnvelope<T> {
  return {
    format: BUILDER_EXPORT_FORMAT,
    version: BUILDER_EXPORT_VERSION,
    builder,
    exported_at: new Date().toISOString(),
    document,
  };
}

function sanitizeFilenameBase(raw: string, fallback: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

/** Trigger a browser download of the versioned builder JSON envelope. */
export function downloadBuilderExport(
  builder: BuilderKind,
  payload: unknown,
  filenameBase: string,
): void {
  const envelope = buildBuilderExportEnvelope(builder, payload);
  const safe = sanitizeFilenameBase(filenameBase, builder);
  const filename = `${safe}-${builder}-builder.json`;
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function asSectionsArray(document: unknown): unknown[] | null {
  if (Array.isArray(document)) {
    return document;
  }
  if (document && typeof document === 'object' && !Array.isArray(document)) {
    const sections = (document as { sections?: unknown }).sections;
    if (Array.isArray(sections)) {
      return sections;
    }
  }
  return null;
}

function normalizeHomepageSections(raw: unknown[]): HomepageSectionInstance[] {
  const out: HomepageSectionInstance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    const type = String(s.type || '').trim();
    if (!type) continue;
    out.push({
      id: String(s.id || `sec_${type}_${out.length + 1}`),
      type,
      enabled: s.enabled !== false,
      layout_width: s.layout_width === 'full' ? 'full' : 'boxed',
      settings:
        s.settings && typeof s.settings === 'object' && !Array.isArray(s.settings)
          ? { ...(s.settings as Record<string, unknown>) }
          : {},
    });
  }
  return out;
}

/** Normalize a builder payload to the canonical in-editor document shape. */
export function normalizeBuilderDocument(builder: BuilderKind, document: unknown): unknown {
  switch (builder) {
    case 'page': {
      const sections = asSectionsArray(document);
      if (!sections) {
        throw new BuilderImportError('INVALID_PAGE_DOCUMENT');
      }
      return {
        sections: ensurePageLayoutBands(sections as PageSectionNode[]),
      } satisfies PageBuilderDocument;
    }
    case 'form': {
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new BuilderImportError('INVALID_FORM_DOCUMENT');
      }
      const d = document as Record<string, unknown>;
      return {
        layout: ensureFormLayout(d.layout),
        actions: ensureFormActions(d.actions),
        settings: ensureFormSettings(d.settings),
      } satisfies FormBuilderDocument;
    }
    case 'homepage': {
      const sections = asSectionsArray(document);
      if (!sections) {
        throw new BuilderImportError('INVALID_HOMEPAGE_DOCUMENT');
      }
      return {
        sections: normalizeHomepageSections(sections),
      } satisfies HomepageBuilderDocument;
    }
    case 'footer':
    case 'header':
    case 'body': {
      const sections = asSectionsArray(document);
      if (!sections) {
        throw new BuilderImportError(
          builder === 'header'
            ? 'INVALID_HEADER_DOCUMENT'
            : builder === 'footer'
              ? 'INVALID_FOOTER_DOCUMENT'
              : 'INVALID_BODY_DOCUMENT',
        );
      }
      return {
        sections: ensurePageLayoutBands(sections as PageSectionNode[]),
      } satisfies FooterBuilderExportDocument;
    }
    case 'theme': {
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new BuilderImportError('INVALID_THEME_DOCUMENT');
      }
      const d = document as Record<string, unknown>;
      const conditions =
        d.conditions && typeof d.conditions === 'object' && !Array.isArray(d.conditions)
          ? d.conditions
          : { relation: 'and', rules: [{ include: true, group: 'entire', key: 'site', value: null }] };
      return {
        conditions,
        header_layout_id: d.header_layout_id == null ? null : Number(d.header_layout_id),
        footer_layout_id: d.footer_layout_id == null ? null : Number(d.footer_layout_id),
        body_layout_id: d.body_layout_id == null ? null : Number(d.body_layout_id),
        status: d.status === 'published' ? 'published' : 'draft',
        name: typeof d.name === 'string' ? d.name : undefined,
      };
    }
    default:
      throw new BuilderImportError('INVALID_SHAPE');
  }
}

/**
 * Accept either a versioned envelope or a raw document for `expectedBuilder`.
 * Returns the normalized document (not the envelope).
 */
export function extractBuilderDocument(data: unknown, expectedBuilder: BuilderKind): unknown {
  if (Array.isArray(data) && (expectedBuilder === 'page' || expectedBuilder === 'homepage' || expectedBuilder === 'header' || expectedBuilder === 'footer' || expectedBuilder === 'body')) {
    return normalizeBuilderDocument(expectedBuilder, { sections: data });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BuilderImportError('INVALID_SHAPE');
  }

  const obj = data as Record<string, unknown>;
  if (obj.format === BUILDER_EXPORT_FORMAT) {
    if (obj.builder !== expectedBuilder) {
      throw new BuilderImportError('BUILDER_MISMATCH');
    }
    if (obj.document === undefined) {
      throw new BuilderImportError('MISSING_DOCUMENT');
    }
    return normalizeBuilderDocument(expectedBuilder, obj.document);
  }

  return normalizeBuilderDocument(expectedBuilder, obj);
}

export function parseBuilderExportJson(raw: string, expectedBuilder: BuilderKind): unknown {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BuilderImportError('INVALID_JSON');
  }
  return extractBuilderDocument(data, expectedBuilder);
}
