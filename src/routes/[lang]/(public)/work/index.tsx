import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getCaseStudies } from '~/lib/marketing/content-layer';
import { readPreferredLocaleFromCookieHeader } from '~/lib/i18n/dashboard-locale';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import type { CaseStudy } from '~/lib/marketing/types';

export const useWorkData = routeLoader$(async ({ request, url }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = readPreferredLocaleFromCookieHeader(cookie) ?? undefined;
  const categorySlug = url.searchParams.get('category_slug') ?? undefined;
  const skillSlug = url.searchParams.get('skill_slug') ?? undefined;
  return getCaseStudies(uiLocale, { categorySlug: categorySlug ?? undefined, skillSlug: skillSlug ?? undefined });
});

export default component$(() => {
  const caseStudies = useWorkData().value;

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
            {caseStudies.map((cs: CaseStudy, i: number) => (
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
            { '@type': 'ListItem', position: 1, name: 'Home', item: (import.meta.env?.VITE_SITE_URL as string) || '' },
            { '@type': 'ListItem', position: 2, name: 'Work' },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = () => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  return {
    title: `Work | ${config.branding.name}`,
    meta: [
      { name: 'description', content: 'Portfolio and case studies of our web and mobile projects.' },
      { property: 'og:title', content: `Work | ${config.branding.name}` },
      { property: 'og:url', content: `${baseUrl}/work` },
    ],
    links: [{ rel: 'canonical', href: `${baseUrl}/work` }],
  };
};
