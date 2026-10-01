import { component$ } from '@builder.io/qwik';
import { renderLayoutBlock } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { ChromeKitView } from '~/components/marketing/chrome/ChromeKitView';
import { LocaleTransitionProvider } from '~/components/common/LocaleTransitionOverlay';
import type { PageLayoutBand, PageLayoutBlock } from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';
import type { PortfolioCategory } from '~/lib/marketing/content-layer';
import type { SiteLanguageRow } from '~/types/site-language';
import { isChromeKitType } from '~/lib/marketing/chrome-blocks';

export type BuilderPreviewSupport = {
  caseStudies: CaseStudy[];
  portfolioCategories: PortfolioCategory[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
  services?: Service[];
  techStack?: string[];
};

export type BuilderPreviewBranding = {
  name: string;
  logo?: string;
  logoDark?: string;
  logoLight?: string;
};

export type BuilderPreviewContext = {
  surface: 'page' | 'chrome';
  uiLocale: string;
  pageTitle: string;
  siteLanguages: SiteLanguageRow[];
  branding?: BuilderPreviewBranding;
  support?: BuilderPreviewSupport;
  isDarkMode: boolean;
};

export type PageBuilderCanvasBlockProps = {
  block: PageLayoutBlock;
  ctx: BuilderPreviewContext;
};

const MENU_BLOCK_TYPES = new Set(['header_menu', 'footer_menu', 'footer_links']);

const SAMPLE_MENU_ITEMS = [
  { label: 'Home', href: '/', open_in_new_tab: false, children: [] },
  { label: 'About', href: '/about/', open_in_new_tab: false, children: [] },
  { label: 'Contact', href: '/contact/', open_in_new_tab: false, children: [] },
];

/** Admin has no PublicMenuResolver inject — seed sample links into empty menu kits. */
export function withChromeMenuSample(block: PageLayoutBlock): PageLayoutBlock {
  if (!MENU_BLOCK_TYPES.has(block.type)) return block;
  const settings = { ...(block.settings || {}) } as Record<string, unknown>;
  if (Array.isArray(settings.items) && settings.items.length > 0) return block;
  return { ...block, settings: { ...settings, items: SAMPLE_MENU_ITEMS } };
}

export function withChromeMenuSamples(bands: PageLayoutBand[]): PageLayoutBand[] {
  return bands.map((band) => ({
    ...band,
    rows: (band.rows || []).map((row) => ({
      ...row,
      columns: (row.columns || []).map((col) => ({
        ...col,
        blocks: (col.blocks || []).map(withChromeMenuSample),
      })),
    })),
  }));
}

export function builderPreviewBranding(ctx: BuilderPreviewContext) {
  return {
    name: ctx.branding?.name || ctx.pageTitle || 'Preview',
    logo: ctx.branding?.logo || '',
    logoDark: ctx.branding?.logoDark || '',
    logoLight: ctx.branding?.logoLight || '',
    site_languages: ctx.siteLanguages || [],
  };
}

/** Shared props for `HomepageSectionsRenderer` / `renderLayoutBlock` in builder previews. */
export function builderPageRendererProps(ctx: BuilderPreviewContext) {
  return {
    uiLocale: ctx.uiLocale,
    services: ctx.support?.services ?? [],
    caseStudies: ctx.support?.caseStudies ?? [],
    portfolioCategories: ctx.support?.portfolioCategories ?? [],
    testimonials: ctx.support?.testimonials ?? [],
    blogPosts: ctx.support?.blogPosts ?? [],
    techStack: ctx.support?.techStack ?? [],
    branding: {
      name: ctx.pageTitle || 'Preview',
      logo: '',
      logoDark: '',
      logoLight: '',
      site_languages: [],
      features: { projects: true, testimonials: true, blog: true, services: true },
    },
    pageContext: { title: ctx.pageTitle || 'Page' },
  };
}

/**
 * Final-render output for one builder leaf inside the editing canvas.
 * Separate component so public renderers load lazily and unchanged blocks skip re-render.
 */
export const PageBuilderCanvasBlock = component$<PageBuilderCanvasBlockProps>(
  (props) => {
    // Page widgets/kits in a header/footer preview through the page renderer below.
    if (props.ctx.surface === 'chrome' && isChromeKitType(props.block.type)) {
      const block = withChromeMenuSample(props.block);
      return (
        <LocaleTransitionProvider>
          <ChromeKitView
            type={block.type}
            settings={(block.settings || {}) as Record<string, unknown>}
            uiLocale={props.ctx.uiLocale}
            branding={builderPreviewBranding(props.ctx)}
            features={{}}
            isDarkMode={props.ctx.isDarkMode}
          />
        </LocaleTransitionProvider>
      );
    }
    return <>{renderLayoutBlock(props.block, { ...builderPageRendererProps(props.ctx), editorPreview: true })}</>;
  },
);
