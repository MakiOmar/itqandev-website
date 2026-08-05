import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { AnimatedCounter } from '~/components/marketing/AnimatedCounter';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { uiLocaleFromPublicRoute, uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { resolveMarketingApiBaseUrl } from '~/lib/marketing/resolve-api-base';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicPageDetail } from '~/types/page';

const ABOUT_PAGE_SLUG = 'about';

export const useAboutCmsPage = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const base = resolveMarketingApiBaseUrl(request.url);
  try {
    const res = await fetch(`${base}${API_ENDPOINTS.PUBLIC_PAGES.GET(ABOUT_PAGE_SLUG)}`, {
      headers: {
        Accept: 'application/json',
        'X-Content-Locale': uiLocale || 'en',
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

export const useAboutSupportingData = routeLoader$(async ({ request, params }) => {
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

/** Legacy hard-coded layout when CMS page slug `about` is missing or pages module is off. */
const LegacyAboutFallback = component$(() => {
  const shell = usePublicShell();
  const about = shell.value.siteContent?.about;
  const tagline = about?.tagline ?? 'We build digital products that scale.';
  const mission = about?.mission ?? '';
  const values = about?.values ?? [];
  const team = about?.team ?? [];
  const processTimeline = about?.processTimeline ?? [];
  const stats = about?.stats ?? [];

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-3xl text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                About us
              </h1>
              <p class="mt-6 text-xl text-slate-600 dark:text-slate-400">{tagline}</p>
              {mission ? (
                <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">{mission}</p>
              ) : null}
            </div>
          </AnimatedReveal>
        </Container>
      </Section>

      {stats.length > 0 ? (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              <div class="grid gap-8 sm:grid-cols-3">
                {stats.map((s: { value: number; label: string }, i: number) => (
                  <AnimatedCounter key={i} value={s.value} label={s.label} />
                ))}
              </div>
            </AnimatedReveal>
          </Container>
        </Section>
      ) : null}

      {values.length > 0 ? (
        <Section>
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Our values</h2>
              <ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
                {values.map((v: string, i: number) => (
                  <li
                    key={i}
                    class="rounded-xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none"
                  >
                    {v}
                  </li>
                ))}
              </ul>
            </AnimatedReveal>
          </Container>
        </Section>
      ) : null}

      {processTimeline.length > 0 ? (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">How we work</h2>
              <ol class="mt-10 space-y-8" role="list">
                {processTimeline.map((step: { title: string; description: string }, i: number) => (
                  <li key={i} class="flex gap-4">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      {i + 1}
                    </span>
                    <div>
                      <h3 class="font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                      <p class="mt-1 text-slate-600 dark:text-slate-400">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </AnimatedReveal>
          </Container>
        </Section>
      ) : null}

      {team.length > 0 ? (
        <Section>
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">The team</h2>
              <ul class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {team.map((member: { name: string; role: string; bio?: string }, i: number) => (
                  <li
                    key={i}
                    class="rounded-xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none"
                  >
                    <p class="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p class="text-sm text-primary-600 dark:text-primary-400">{member.role}</p>
                    {member.bio ? (
                      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{member.bio}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AnimatedReveal>
          </Container>
        </Section>
      ) : null}
    </>
  );
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const shell = usePublicShell();
  const cms = useAboutCmsPage();
  const support = useAboutSupportingData();
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
        pageContext={{ title: page.title || 'About', slug: page.slug }}
      />
    );
  }

  return <LegacyAboutFallback />;
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  let pageTitle = 'About';
  let description = 'Learn about our studio, values, and journey building digital products since 2014.';
  try {
    const page = resolveValue(useAboutCmsPage) as PublicPageDetail | null;
    if (page && typeof page.title === 'string' && page.title.trim()) {
      pageTitle = page.title.trim();
      if (typeof page.excerpt === 'string' && page.excerpt.trim()) {
        description = page.excerpt.trim();
      }
    }
  } catch {
    /* loader unavailable during head — keep defaults */
  }
  return publicListPageHead({
    page: pageTitle,
    description,
    resolveValue,
    usePublicShell,
    url,
  });
};
