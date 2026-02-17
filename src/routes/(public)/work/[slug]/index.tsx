import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getCaseStudyBySlug } from '~/lib/marketing/content-layer';
import { MARKETING_ROUTES } from '~/lib/marketing/constants';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { Link } from '@builder.io/qwik-city';

export const useCaseStudy = routeLoader$(async ({ params }) => {
  const slug = params.slug;
  const caseStudy = await getCaseStudyBySlug(slug);
  if (!caseStudy) throw new Error('Case study not found');
  return caseStudy;
});

const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"%3E%3Crect fill="%23e2e8f0" width="800" height="450"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="18"%3EProject%3C/text%3E%3C/svg%3E';

export default component$(() => {
  const caseStudy = useCaseStudy().value;
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || '';

  const imageSrc = caseStudy.image || placeholderImage;

  return (
    <>
      <Section>
        <Container size="narrow">
          <AnimatedReveal>
            <Link
              href={MARKETING_ROUTES.work}
              class="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to work
            </Link>
          </AnimatedReveal>

          <article class="mt-8">
            <AnimatedReveal delay={60}>
              <div class="aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
                <img
                  src={imageSrc}
                  alt={caseStudy.imageAlt || caseStudy.title}
                  width={800}
                  height={450}
                  class="h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={100}>
              {caseStudy.tags && caseStudy.tags.length > 0 && (
                <ul class="mt-6 flex flex-wrap gap-2" role="list">
                  {caseStudy.tags.map((tag: string) => (
                    <li
                      key={tag}
                      class="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              <h1 class="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                {caseStudy.title}
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                {caseStudy.summary}
              </p>
              {caseStudy.description && (
                <div class="prose prose-slate mt-8 dark:prose-invert max-w-none">
                  <p class="text-slate-700 dark:text-slate-300">{caseStudy.description}</p>
                </div>
              )}
              <div class="mt-8 flex flex-wrap gap-4">
                {caseStudy.linkUrl && (
                  <a
                    href={caseStudy.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                  >
                    View project
                    <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {caseStudy.demoUrl && (
                  <a
                    href={caseStudy.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Demo
                  </a>
                )}
                {caseStudy.repoUrl && (
                  <a
                    href={caseStudy.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Repository
                  </a>
                )}
              </div>
            </AnimatedReveal>
          </article>
        </Container>
      </Section>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: 'Work', item: baseUrl + '/work' },
            { '@type': 'ListItem', position: 3, name: caseStudy.title },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  const caseStudy = resolveValue(useCaseStudy);
  return {
    title: `${caseStudy.title} | Work | ${config.branding.name}`,
    meta: [
      { name: 'description', content: caseStudy.summary },
      { property: 'og:title', content: caseStudy.title },
      { property: 'og:description', content: caseStudy.summary },
      { property: 'og:url', content: `${baseUrl}/work/${caseStudy.slug}` },
    ],
    links: [{ rel: 'canonical', href: `${baseUrl}/work/${caseStudy.slug}` }],
  };
};
