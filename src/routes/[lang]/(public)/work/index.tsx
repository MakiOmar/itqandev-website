import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { buildCanonicalHref, getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { getCaseStudies } from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import type { CaseStudy } from '~/lib/marketing/types';

export const useWorkData = routeLoader$(async ({ request, url, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const categorySlug = url.searchParams.get('category_slug') ?? undefined;
  const skillSlug = url.searchParams.get('skill_slug') ?? undefined;
  return getCaseStudies(
    uiLocale,
    { categorySlug: categorySlug ?? undefined, skillSlug: skillSlug ?? undefined },
    { forwardDocumentUrl: request.url },
  );
});

export default component$(() => {
  const loc = useLocation();
  const loaderData = useWorkData();
  const caseStudiesState = useSignal(loaderData.value);

  // Ensure listings appear on in-app navigation when SSR q-data briefly returns empty.
  useVisibleTask$(async ({ track }) => {
    const pathname = track(() => loc.url.pathname);
    const search = track(() => loc.url.search);
    const current = track(() => loaderData.value);
    caseStudiesState.value = current;
    if (current.length > 0) {
      return;
    }
    const uiLocale = uiLangFromUrlPathname(pathname);
    const url = new URL(`http://local${pathname}${search}`);
    const categorySlug = url.searchParams.get('category_slug') ?? undefined;
    const skillSlug = url.searchParams.get('skill_slug') ?? undefined;
    const fetched = await getCaseStudies(
      uiLocale,
      { categorySlug, skillSlug },
      { forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null },
    );
    caseStudiesState.value = fetched;
  });

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Our work
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Selected projects we&apos;ve delivered for clients.
              </p>
            </div>
          </AnimatedReveal>

          <ul class="mx-auto mt-16 grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {caseStudiesState.value.map((cs: CaseStudy, i: number) => (
              <li key={cs.id}>
                <AnimatedReveal delay={i * 60}>
                  <CaseStudyCard caseStudy={cs} />
                </AnimatedReveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: getPublicSiteBaseUrl() },
            { '@type': 'ListItem', position: 2, name: 'Work' },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const config = getConfig();
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  return {
    title: `Work | ${config.branding.name}`,
    meta: [
      { name: 'description', content: 'Portfolio and case studies of our web and mobile projects.' },
      { property: 'og:title', content: `Work | ${config.branding.name}` },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  };
};
