import { component$ } from '@builder.io/qwik';
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
import { AtomicWidgetView } from '~/components/marketing/widgets/AtomicWidgetView';
import { ContentKitView } from '~/components/marketing/kits/ContentKitView';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import {
  columnSpanClassNames,
  isPageLayoutBand,
  normalizeColumnSpans,
} from '~/lib/marketing/page-layout-utils';
import {
  defaultHomepageSections,
  type HomepageSectionInstance,
  type PageLayoutBand,
  type PageSectionNode,
} from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';
import { getConfig } from '~/lib/config';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';

const GAP_CLASS: Record<number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16',
};

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
  'map',
  'social_links',
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
};

function renderBlock(
  block: { id?: string; kind?: string; type: string; settings?: Record<string, unknown> },
  props: HomepageSectionsRendererProps,
) {
  const key = block.id || block.type;
  const settings = block.settings ?? {};
  const showTestimonialsModule = isFeatureModuleEnabled(props.branding.features, 'testimonials');
  const showFormsModule = isFeatureModuleEnabled(props.branding.features, 'forms');
  const showBlogModule = isFeatureModuleEnabled(props.branding.features, 'blog');
  const showServicesModule = isFeatureModuleEnabled(props.branding.features, 'services');
  const showProjectsModule = isFeatureModuleEnabled(props.branding.features, 'projects');
  const kind = block.kind || (WIDGET_TYPES.has(block.type) ? 'widget' : 'kit');

  if (kind === 'widget' || WIDGET_TYPES.has(block.type)) {
    return (
      <AtomicWidgetView key={key} type={block.type} settings={settings} uiLocale={props.uiLocale} />
    );
  }
  if (CONTENT_KITS.has(block.type)) {
    return (
      <ContentKitView key={key} type={block.type} settings={settings} uiLocale={props.uiLocale} />
    );
  }

  switch (block.type) {
    case 'hero':
      return <HeroHomeSection key={key} settings={settings} uiLocale={props.uiLocale} />;
    case 'services_teaser':
      if (!showServicesModule) return null;
      return (
        <ServicesTeaserHomeSection
          key={key}
          settings={settings}
          uiLocale={props.uiLocale}
          services={props.services}
        />
      );
    case 'case_studies':
      if (!showProjectsModule) return null;
      return (
        <CaseStudiesHomeSection
          key={key}
          settings={settings}
          uiLocale={props.uiLocale}
          caseStudies={props.caseStudies}
        />
      );
    case 'testimonials':
      if (!showTestimonialsModule) return null;
      return (
        <TestimonialsHomeSection
          key={key}
          settings={settings}
          testimonials={props.testimonials}
        />
      );
    case 'tech_stack':
      return <TechStackHomeSection key={key} settings={settings} techStack={props.techStack} />;
    case 'blog_preview':
      if (!showBlogModule) return null;
      return (
        <BlogPreviewHomeSection
          key={key}
          settings={settings}
          uiLocale={props.uiLocale}
          blogPosts={props.blogPosts}
        />
      );
    case 'cta':
      return <CtaHomeSection key={key} settings={settings} uiLocale={props.uiLocale} />;
    case 'form': {
      if (!showFormsModule) return null;
      const formSlug = String(settings.form_slug ?? '').trim();
      if (!formSlug) return null;
      const title = String(settings.title ?? '').trim();
      const subtitle = String(settings.subtitle ?? '').trim();
      return (
        <section key={key} class="py-10">
          <FormRenderer
            slug={formSlug}
            contentLocale={props.uiLocale}
            title={title || undefined}
            subtitle={subtitle || undefined}
          />
        </section>
      );
    }
    default:
      return null;
  }
}

function renderLayoutBand(band: PageLayoutBand, props: HomepageSectionsRendererProps) {
  const inner = (
    <div class="space-y-6 py-8">
      {(band.rows ?? []).map((row) => {
        const gap = typeof row.gap === 'number' ? row.gap : 4;
        const gapClass = GAP_CLASS[gap] ?? 'gap-4';
        const stackBelow = row.stack_below ?? 'none';
        return (
          <div key={row.id} class={`grid grid-cols-12 ${gapClass}`}>
            {(row.columns ?? []).map((col) => {
              const span = normalizeColumnSpans(col.span);
              const spanClass = columnSpanClassNames(span, stackBelow);
              return (
                <div key={col.id} class={spanClass}>
                  <div class="space-y-6">
                    {(col.blocks ?? [])
                      .filter((b) => b.enabled !== false)
                      .map((block) => renderBlock(block, props))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if ((band.layout_width ?? 'boxed') === 'full') {
    return (
      <section key={band.id} class="w-full">
        {inner}
      </section>
    );
  }

  return (
    <section key={band.id} class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {inner}
    </section>
  );
}

export const HomepageSectionsRenderer = component$<HomepageSectionsRendererProps>((props) => {
  const allowDefaults = props.allowDefaultSections !== false;
  const layoutAware = props.layoutAware === true;
  const list =
    props.sections && props.sections.length > 0
      ? props.sections
      : allowDefaults
        ? defaultHomepageSections()
        : [];
  const config = getConfig();

  return (
    <>
      {list.map((node) => {
        if (layoutAware && isPageLayoutBand(node as PageSectionNode)) {
          if ((node as PageLayoutBand).enabled === false) return null;
          return renderLayoutBand(node as PageLayoutBand, props);
        }
        const section = node as HomepageSectionInstance;
        if (section.enabled === false) return null;
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
