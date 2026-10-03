import { component$, type JSXOutput } from '@builder.io/qwik';
import {
  BlogPreviewHomeSection,
  CaseStudiesHomeSection,
  CtaHomeSection,
  HeroHomeSection,
  ServicesTeaserHomeSection,
  TechStackHomeSection,
  TestimonialsHomeSection,
} from '~/components/marketing/home-sections/HomeSections';
import { FormRenderer } from '~/components/marketing/forms/FormRenderer';
import { BlogPostsList } from '~/components/marketing/blog/BlogPostsList';
import { PortfolioProjectsList } from '~/components/marketing/portfolio/PortfolioProjectsList';
import { AtomicWidgetView } from '~/components/marketing/widgets/AtomicWidgetView';
import { TestimonialsWidget } from '~/components/marketing/widgets/TestimonialsWidget';
import { StyledBuilderLeaf } from '~/components/marketing/widgets/StyledBuilderLeaf';
import { ContentKitView } from '~/components/marketing/kits/ContentKitView';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import {
  columnSpanClassNames,
  isPageLayoutBand,
  normalizeColumnSpans,
  rowFlexStyle,
  columnContentLayout,
  rowGapClass,
} from '~/lib/marketing/page-layout-utils';
import { filterPageSectionsForDevice, hideOnClass } from '~/lib/marketing/device-visibility';
import { useLayoutDevice } from '~/lib/marketing/layout-device-context';
import { LayoutNodeShell } from '~/components/marketing/layout/LayoutNodeShell';
import {
  defaultHomepageSections,
  type HomepageSectionInstance,
  type PageLayoutBand,
  type PageLayoutBlock,
  type PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service, ContactInfo } from '~/lib/marketing/types';
import type {
  BlogPostListResult,
  CaseStudyListResult,
  PortfolioCategory,
} from '~/lib/marketing/content-layer';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';
import { getConfig } from '~/lib/config';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import {
  hasAnyStyles,
  hasWidgetStyleControls,
  type BuilderStyles,
} from '~/lib/marketing/builder-styles';

const WIDGET_TYPES = new Set([
  'heading',
  'text',
  'rich_text',
  'image',
  'button',
  'video',
  'spacer',
  'divider',
  'list',
  'quote',
  'badge',
  'gallery',
  'icon',
  'embed',
  'button_group',
  'anchor',
  'breadcrumb',
  'map',
  'social_links',
  'lottie',
  'flip_box',
  'trust_badges',
  'post_title',
  'post_excerpt',
  'post_content',
  'post_featured_image',
  'post_info',
  'archive_title',
  'loop_grid',
  'testimonial_list',
]);

const CONTENT_KITS = new Set([
  'faq',
  'stats',
  'pricing',
  'contact_info',
  'image_text',
  'timeline',
  'team',
  'feature_grid',
  'logo_cloud',
  'accordion_content',
  'tabs_content',
  'video_cta',
  'page_header',
]);

export type HomepageSectionsRendererProps = {
  sections?: HomepageSectionInstance[] | PageSectionNode[] | null;
  uiLocale: string;
  services: Service[];
  caseStudies: CaseStudy[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
  techStack: string[];
  branding: PublicBrandingState;
  /**
   * When true (default), empty/missing sections fall back to homepage defaults.
   * CMS pages should pass false so an empty builder stays empty.
   */
  allowDefaultSections?: boolean;
  /**
   * When true, treat `type: layout` nodes as band→row→column→block trees (CMS pages).
   * Homepage Appearance stays flat.
   */
  layoutAware?: boolean;
  /** Current CMS page identity for page_header kit (title / crumbs). */
  pageContext?: { title: string; slug?: string };
  /** Site contact for contact_info `use_site_contact`. */
  siteContact?: ContactInfo | null;
  /** Skip kit Section/Container when rendering inside layout columns. */
  embedKits?: boolean;
  /** SSR payload for `projects_list` kit (portfolio page). */
  portfolioList?: CaseStudyListResult | null;
  portfolioCategories?: PortfolioCategory[] | null;
  portfolioCategorySlug?: string | null;
  portfolioSkillSlug?: string | null;
  /** SSR payload for `blog_posts_list` kit (articles / blog page). */
  blogList?: BlogPostListResult | null;
  /** Builder editing canvas: widgets may show authoring hints the public site never renders. */
  editorPreview?: boolean;
};

function renderBlock(
  block: {
    id?: string;
    kind?: string;
    type: string;
    settings?: Record<string, unknown>;
    styles?: BuilderStyles | null;
    rows?: PageLayoutBand['rows'];
  },
  props: HomepageSectionsRendererProps,
) {
  if (block.type === 'inner_band') {
    return renderLayoutBand(
      {
        id: String(block.id || 'inner'),
        type: 'layout',
        layout_width: 'boxed',
        settings: block.settings,
        styles: block.styles || undefined,
        rows: block.rows ?? [],
      },
      props,
    );
  }
  const key = block.id || block.type;
  const settings = block.settings ?? {};
  const showTestimonialsModule = isFeatureModuleEnabled(props.branding.features, 'testimonials');
  const showFormsModule = isFeatureModuleEnabled(props.branding.features, 'forms');
  const showBlogModule = isFeatureModuleEnabled(props.branding.features, 'blog');
  const showServicesModule = isFeatureModuleEnabled(props.branding.features, 'services');
  const showProjectsModule = isFeatureModuleEnabled(props.branding.features, 'projects');
  const kind = block.kind || (WIDGET_TYPES.has(block.type) ? 'widget' : 'kit');
  const wrapStyles = hasWidgetStyleControls(block.type) || hasAnyStyles(block.styles);
  const embedded = props.embedKits === true;
  // Locals, not `block.styles` in JSX: the optimizer freezes member props of plain objects,
  // so the builder canvas would keep the first styles it rendered.
  const blockStyles = block.styles;
  const wrap = (inner: JSXOutput) => {
    // Background sits inside the sized leaf so width/padding Style controls frame the fill.
    // No `styles` on the shell: the leaf's styles live on StyledBuilderLeaf; the id scopes background overrides.
    const leafId = String(block.id || key);
    const withBg = <LayoutNodeShell id={leafId} settings={settings}>{inner}</LayoutNodeShell>;
    return wrapStyles ? (
      <StyledBuilderLeaf key={key} id={leafId} styles={blockStyles} settings={settings}>
        {withBg}
      </StyledBuilderLeaf>
    ) : (
      <LayoutNodeShell key={key} id={leafId} settings={settings}>
        {inner}
      </LayoutNodeShell>
    );
  };

  if (block.type === 'testimonial_list') {
    if (!showTestimonialsModule) return null;
    return wrap(
      <TestimonialsWidget
        settings={settings}
        testimonials={props.testimonials}
        uiLocale={props.uiLocale}
        editorPreview={props.editorPreview}
      />,
    );
  }
  if (kind === 'widget' || WIDGET_TYPES.has(block.type)) {
    return wrap(
      <AtomicWidgetView
        type={block.type}
        settings={settings}
        uiLocale={props.uiLocale}
        styled={wrapStyles}
      />,
    );
  }
  if (CONTENT_KITS.has(block.type)) {
    return wrap(
      <ContentKitView
        type={block.type}
        settings={settings}
        uiLocale={props.uiLocale}
        pageContext={props.pageContext}
        embedded={embedded}
        siteContact={props.siteContact}
        styled={hasAnyStyles(block.styles)}
      />,
    );
  }

  // Kits registered in WIDGET_STYLE_GROUPS must go through wrap() so Style tab
  // width / spacing / border / background emit (same as widgets + ContentKitView).
  switch (block.type) {
    case 'hero':
      return wrap(
        <HeroHomeSection settings={settings} uiLocale={props.uiLocale} embedded={embedded} />,
      );
    case 'services_teaser':
      if (!showServicesModule) return null;
      return wrap(
        <ServicesTeaserHomeSection
          settings={settings}
          uiLocale={props.uiLocale}
          services={props.services}
          embedded={embedded}
        />,
      );
    case 'case_studies':
      if (!showProjectsModule) return null;
      return wrap(
        <CaseStudiesHomeSection
          settings={settings}
          uiLocale={props.uiLocale}
          caseStudies={props.caseStudies}
          portfolioCategories={props.portfolioCategories ?? []}
          embedded={embedded}
        />,
      );
    case 'testimonials':
      if (!showTestimonialsModule) return null;
      return wrap(
        <TestimonialsHomeSection
          settings={settings}
          testimonials={props.testimonials}
          uiLocale={props.uiLocale}
          embedded={embedded}
        />,
      );
    case 'tech_stack':
      return wrap(
        <TechStackHomeSection
          settings={settings}
          techStack={props.techStack}
          embedded={embedded}
        />,
      );
    case 'blog_preview':
      if (!showBlogModule) return null;
      return wrap(
        <BlogPreviewHomeSection
          settings={settings}
          uiLocale={props.uiLocale}
          blogPosts={props.blogPosts}
          embedded={embedded}
        />,
      );
    case 'cta':
      return wrap(
        <CtaHomeSection settings={settings} uiLocale={props.uiLocale} embedded={embedded} />,
      );
    case 'form': {
      if (!showFormsModule) return null;
      const formSlug = String(settings.form_slug ?? '').trim();
      if (!formSlug) return null;
      const title = String(settings.title ?? '').trim();
      const subtitle = String(settings.subtitle ?? '').trim();
      const form = (
        <FormRenderer
          slug={formSlug}
          contentLocale={props.uiLocale}
          title={title || undefined}
          subtitle={subtitle || undefined}
          class="w-full"
        />
      );
      if (embedded) {
        return wrap(
          <div class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm shadow-primary-500/5 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/55 dark:backdrop-blur-none sm:p-8">
            <div
              class="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-900/20"
              aria-hidden="true"
            />
            <div class="relative">{form}</div>
          </div>,
        );
      }
      return wrap(<section class="py-10">{form}</section>);
    }
    case 'projects_list': {
      if (!showProjectsModule) return null;
      const showFilters =
        settings.show_filters === true ||
        settings.show_filters === 'true' ||
        settings.show_filters === 1 ||
        settings.show_filters === undefined;
      const filterCategoryIds = Array.isArray(settings.category_ids)
        ? (settings.category_ids as unknown[])
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];
      const emptyList: CaseStudyListResult = {
        items: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 12,
          total: 0,
          from: null,
          to: null,
        },
      };
      const list = (
        <PortfolioProjectsList
          uiLocale={props.uiLocale}
          initialList={props.portfolioList ?? emptyList}
          initialCategories={props.portfolioCategories ?? []}
          initialCategorySlug={props.portfolioCategorySlug ?? null}
          initialSkillSlug={props.portfolioSkillSlug ?? null}
          showFilters={showFilters}
          filterCategoryIds={filterCategoryIds}
        />
      );
      if (embedded) {
        return wrap(<div class="w-full">{list}</div>);
      }
      return wrap(<section class="py-10">{list}</section>);
    }
    case 'blog_posts_list': {
      if (!showBlogModule) return null;
      const perPageRaw = Number(settings.per_page);
      const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.min(48, perPageRaw) : 12;
      const emptyBlogList: BlogPostListResult = {
        items: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: 0,
          from: null,
          to: null,
        },
      };
      const blogList = (
        <BlogPostsList
          uiLocale={props.uiLocale}
          initialList={props.blogList ?? emptyBlogList}
          perPage={perPage}
        />
      );
      if (embedded) {
        return wrap(<div class="w-full">{blogList}</div>);
      }
      return wrap(<section class="py-10">{blogList}</section>);
    }
    default:
      return null;
  }
}

/** Render one leaf (widget / kit / inner band) exactly as inside a public layout column. */
export function renderLayoutBlock(
  block: PageLayoutBlock,
  props: HomepageSectionsRendererProps,
): JSXOutput {
  return renderBlock(block, { ...props, embedKits: true });
}

function renderLayoutBand(band: PageLayoutBand, props: HomepageSectionsRendererProps) {
  const bandProps: HomepageSectionsRendererProps = { ...props, embedKits: true };
  const bandSettings = band.settings;
  const bandStyles = band.styles;
  const hide = (hideOn: unknown) => (props.editorPreview ? '' : hideOnClass(hideOn));
  const inner = (
    <LayoutNodeShell
      id={band.id}
      settings={bandSettings}
      styles={bandStyles}
      class="w-full py-6 sm:py-8 lg:py-10"
    >
      {(band.rows ?? []).map((row) => {
        const stackBelow = row.stack_below ?? 'none';
        const rowSettings = row.settings;
        const rowStyles = row.styles;
        return (
          <LayoutNodeShell
            key={row.id}
            id={row.id}
            settings={rowSettings}
            styles={rowStyles}
            class={`w-full rounded-xl ${hide(row.hide_on)}`}
          >
            <div
              class={`grid h-full grid-cols-12 items-stretch ${rowGapClass(row.gap)} ${
                row.direction === 'column' ? 'flex flex-col' : ''
              }`}
              style={rowFlexStyle(row)}
            >
              {(row.columns ?? []).map((col) => {
                const span = normalizeColumnSpans(col.span);
                const spanClass = columnSpanClassNames(span, stackBelow);
                const colSettings = col.settings;
                const colStyles = col.styles;
                const content = columnContentLayout(row, col);
                return (
                  <LayoutNodeShell
                    key={col.id}
                    id={col.id}
                    settings={colSettings}
                    styles={colStyles}
                    class={`${spanClass} h-full ${hide(col.hide_on)}`}
                  >
                    <div class={content.class} style={content.style}>
                      {(col.blocks ?? [])
                        .filter((b) => b.enabled !== false)
                        .map((block) => {
                          const hideClass = hide(block.hide_on);
                          const rendered = renderBlock(block, bandProps);
                          return hideClass ? (
                            <div key={block.id || block.type} class={hideClass}>
                              {rendered}
                            </div>
                          ) : (
                            rendered
                          );
                        })}
                    </div>
                  </LayoutNodeShell>
                );
              })}
            </div>
          </LayoutNodeShell>
        );
      })}
    </LayoutNodeShell>
  );

  if ((band.layout_width ?? 'boxed') === 'full') {
    return (
      <section key={band.id} class={`w-full ${hide(band.hide_on)}`}>
        {inner}
      </section>
    );
  }

  return (
    <section key={band.id} class={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${hide(band.hide_on)}`}>
      {inner}
    </section>
  );
}

export const HomepageSectionsRenderer = component$<HomepageSectionsRendererProps>((props) => {
  const allowDefaults = props.allowDefaultSections !== false;
  const layoutAware = props.layoutAware === true;
  const device = useLayoutDevice();
  const rawList =
    props.sections && props.sections.length > 0
      ? props.sections
      : allowDefaults
        ? defaultHomepageSections()
        : [];
  const list = filterPageSectionsForDevice(rawList as PageSectionNode[], device);
  const config = getConfig();

  return (
    <>
      {list.map((node) => {
        if (layoutAware && isPageLayoutBand(node as PageSectionNode)) {
          return renderLayoutBand(node as PageLayoutBand, props);
        }
        const section = node as HomepageSectionInstance;
        return renderBlock(section, props);
      })}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: config.branding.name,
          url: getPublicSiteBaseUrl(),
          description: 'Web, Android & iOS development agency.',
        })}
      />
    </>
  );
});
