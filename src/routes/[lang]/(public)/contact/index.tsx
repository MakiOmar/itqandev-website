import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { FormRenderer } from '~/components/marketing/forms/FormRenderer';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { useTranslate } from '~/lib/i18n/useTranslate';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

const CONTACT_PAGE_SLUG = 'contact';

export const useContactCmsPage = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(CONTACT_PAGE_SLUG)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale,
        Cookie: cookie,
      },
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as PublicPageDetail & { data?: unknown };
    if (json && typeof json === 'object' && Array.isArray(json.sections)) {
      return json;
    }
    if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
      return json.data as PublicPageDetail;
    }
    return null;
  } catch {
    return null;
  }
});

export const useContactSupportingData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(6, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, blogPosts: blogPosts.slice(0, 3) };
});

/** Legacy hard-coded layout when CMS page slug `contact` is missing or pages module is off. */
const LegacyContactFallback = component$(() => {
  const shell = usePublicShell();
  const { lang } = useTranslate();
  const contact = shell.value.siteContent?.contact;

  return (
    <Section>
      <Container>
        <div class="mx-auto max-w-4xl">
          <AnimatedReveal>
            <div class="text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Get in touch
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Tell us about your project. We&apos;ll respond within 24 hours.
              </p>
            </div>
          </AnimatedReveal>

          <div class="mt-16 grid gap-12 lg:grid-cols-2">
            {/* CMS Form slug `contact` (ContactFormSeeder / admin Forms) */}
            <AnimatedReveal delay={80}>
              <FormRenderer slug="contact" contentLocale={lang} />
            </AnimatedReveal>

            <AnimatedReveal delay={120}>
              <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-8 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none">
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Office</h2>
                {contact?.address && (
                  <p class="mt-2 text-slate-600 dark:text-slate-400">{contact.address}</p>
                )}
                {contact?.email && (
                  <p class="mt-4">
                    <a
                      href={`mailto:${contact.email}`}
                      class="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact?.phone && (
                  <p class="mt-2">
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, '')}`}
                      class="font-medium text-slate-700 dark:text-slate-300"
                    >
                      {contact.phone}
                    </a>
                  </p>
                )}
                {contact?.calendarLink && (
                  <p class="mt-6">
                    <a
                      href={contact.calendarLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      Book a call
                      <svg
                        class="ml-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </p>
                )}
                {contact?.socials && contact.socials.length > 0 && (
                  <ul class="mt-6 flex gap-4" role="list">
                    {contact.socials.map((s: { name: string; url: string }) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          aria-label={s.name}
                        >
                          {s.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </Container>
    </Section>
  );
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const cms = useContactCmsPage();
  const support = useContactSupportingData();
  const pagesOn = isFeatureModuleEnabled(shell.value.branding.features, 'pages');
  const page = cms.value;

  if (
    pagesOn &&
    page &&
    typeof page === 'object' &&
    typeof page.slug === 'string' &&
    Array.isArray(page.sections)
  ) {
    return (
      <HomepageSectionsRenderer
        sections={(page.sections || []) as PageSectionNode[]}
        uiLocale={uiLocale}
        services={shell.value.siteContent?.services ?? []}
        caseStudies={support.value.caseStudies}
        testimonials={support.value.testimonials}
        blogPosts={support.value.blogPosts}
        techStack={shell.value.siteContent?.techStack ?? []}
        branding={shell.value.branding}
        siteContact={shell.value.siteContent?.contact}
        layoutAware={true}
        allowDefaultSections={false}
        pageContext={{ title: page.title || 'Contact', slug: page.slug }}
      />
    );
  }

  return <LegacyContactFallback />;
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  try {
    const page = resolveValue(useContactCmsPage) as PublicPageDetail | null;
    if (page && typeof page.title === 'string') {
      return publicListPageHead({
        resolveValue,
        url,
        title: page.title || 'Contact',
        description: page.excerpt || 'Get in touch with our team.',
      });
    }
  } catch {
    /* fall through */
  }
  return publicListPageHead({
    resolveValue,
    url,
    title: 'Contact',
    description: 'Get in touch with our team.',
  });
};
