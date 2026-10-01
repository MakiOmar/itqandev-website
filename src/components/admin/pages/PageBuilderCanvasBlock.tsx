import { component$ } from '@builder.io/qwik';
import { renderLayoutBlock } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { ChromeKitView } from '~/components/marketing/chrome/ChromeKitView';
import { LocaleTransitionProvider } from '~/components/common/LocaleTransitionOverlay';
import type { PageLayoutBand, PageLayoutBlock } from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';
import type { PortfolioCategory } from '~/lib/marketing/content-layer';
import type { SiteLanguageRow } from '~/types/site-language';
import { isChromeKitType } from '~/lib/marketing/chrome-blocks';
import type { AuthSession } from '~/lib/auth/types';
import {
  CHROME_MENU_KIT_TYPES,
  chromeMenuSlug,
  type ChromeMenuMap,
} from '~/lib/admin/builder-chrome-menus';

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
  /** Signed-in editor, so header actions preview the logged-in state like the frontend. */
  session?: Pick<AuthSession, 'user'> | null;
  /** Published menu trees by slug (see `useBuilderChromeMenus`). */
  menus?: ChromeMenuMap;
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

/**
 * Admin documents carry no injected menu items: use the published menu for the kit's slug, then
 * any stored items, then sample links (menu not fetched yet or fetch failed).
 */
export function withChromeMenuSample(block: PageLayoutBlock, menus?: ChromeMenuMap): PageLayoutBlock {
  if (!MENU_BLOCK_TYPES.has(block.type)) return block;
  const settings = { ...(block.settings || {}) } as Record<string, unknown>;
  const published = CHROME_MENU_KIT_TYPES.has(block.type) ? menus?.[chromeMenuSlug(settings)] : undefined;
  if (published) return { ...block, settings: { ...settings, items: published } };
  if (Array.isArray(settings.items) && settings.items.length > 0) return block;
  return { ...block, settings: { ...settings, items: SAMPLE_MENU_ITEMS } };
}

export function withChromeMenuSamples(bands: PageLayoutBand[], menus?: ChromeMenuMap): PageLayoutBand[] {
  return bands.map((band) => ({
    ...band,
    rows: (band.rows || []).map((row) => ({
      ...row,
      columns: (row.columns || []).map((col) => ({
        ...col,
        blocks: (col.blocks || []).map((block) => withChromeMenuSample(block, menus)),
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
      const block = withChromeMenuSample(props.block, props.ctx.menus);
      return (
        <LocaleTransitionProvider>
          {/* Inert in the editor: clicks select the block and can't open dropdowns or log out */}
          <div class="pointer-events-none">
            <ChromeKitView
              type={block.type}
              settings={(block.settings || {}) as Record<string, unknown>}
              uiLocale={props.ctx.uiLocale}
              branding={builderPreviewBranding(props.ctx)}
              session={props.ctx.session}
              features={{}}
              isDarkMode={props.ctx.isDarkMode}
            />
          </div>
        </LocaleTransitionProvider>
      );
    }
    return <>{renderLayoutBlock(props.block, { ...builderPageRendererProps(props.ctx), editorPreview: true })}</>;
  },
);
