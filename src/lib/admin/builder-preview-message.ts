import type { LayoutBreakpoint, PageLayoutBand } from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';
import type { PortfolioCategory } from '~/lib/marketing/content-layer';

/**
 * postMessage contract between the builder "view page" frame (parent) and the
 * admin `builder-preview` route (iframe). Same-origin only.
 */
export const BUILDER_PREVIEW_READY = 'credocode:builder-preview:ready';
export const BUILDER_PREVIEW_DOCUMENT = 'credocode:builder-preview:document';

export type BuilderPreviewPayload = {
  bands: PageLayoutBand[];
  surface: 'page' | 'chrome';
  /** Which site chrome the document replaces when `surface` is `chrome`. */
  chromeKind?: 'header' | 'footer';
  device: LayoutBreakpoint;
  uiLocale: string;
  pageTitle: string;
  support?: {
    caseStudies: CaseStudy[];
    portfolioCategories: PortfolioCategory[];
    testimonials: Testimonial[];
    blogPosts: BlogPost[];
    services?: Service[];
    techStack?: string[];
  };
};

export type BuilderPreviewMessage =
  | { type: typeof BUILDER_PREVIEW_READY }
  | { type: typeof BUILDER_PREVIEW_DOCUMENT; payload: BuilderPreviewPayload };

export function isBuilderPreviewMessage(data: unknown): data is BuilderPreviewMessage {
  if (!data || typeof data !== 'object') return false;
  const type = (data as { type?: unknown }).type;
  return type === BUILDER_PREVIEW_READY || type === BUILDER_PREVIEW_DOCUMENT;
}

/** Strip Qwik store proxies so the payload survives structured clone. */
export function toPlainPreviewPayload(payload: BuilderPreviewPayload): BuilderPreviewPayload {
  return JSON.parse(JSON.stringify(payload)) as BuilderPreviewPayload;
}
