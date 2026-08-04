import { component$ } from '@builder.io/qwik';
import { getConfig } from '~/lib/config';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import {
  BlogPreviewHomeSection,
  CaseStudiesHomeSection,
  CtaHomeSection,
  HeroHomeSection,
  ServicesTeaserHomeSection,
  TechStackHomeSection,
  TestimonialsHomeSection,
} from '~/components/marketing/home-sections/HomeSections';
import {
  defaultHomepageSections,
  type HomepageSectionInstance,
} from '~/lib/marketing/appearance-types';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';

export type HomepageSectionsRendererProps = {
  sections?: HomepageSectionInstance[] | null;
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
};

export const HomepageSectionsRenderer = component$<HomepageSectionsRendererProps>((props) => {
  const allowDefaults = props.allowDefaultSections !== false;
  const list =
    props.sections && props.sections.length > 0
      ? props.sections
      : allowDefaults
        ? defaultHomepageSections()
        : [];
  const showTestimonialsModule = isFeatureModuleEnabled(props.branding.features, 'testimonials');
  const config = getConfig();

  return (
    <>
      {list.map((section) => {
        const key = section.id || section.type;
        const settings = section.settings ?? {};
        switch (section.type) {
          case 'hero':
            return <HeroHomeSection key={key} settings={settings} uiLocale={props.uiLocale} />;
          case 'services_teaser':
            return (
              <ServicesTeaserHomeSection
                key={key}
                settings={settings}
                uiLocale={props.uiLocale}
                services={props.services}
              />
            );
          case 'case_studies':
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
            return (
              <TechStackHomeSection key={key} settings={settings} techStack={props.techStack} />
            );
          case 'blog_preview':
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
          default:
            return null;
        }
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
