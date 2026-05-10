import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getSiteContent } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import type { Service } from '~/lib/marketing/types';

export const useServicesData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang);
  return getSiteContent(uiLocale);
});

export default component$(() => {
  const data = useServicesData();
  const services = data.value?.services ?? [];

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Our services
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Web, mobile, design, and backend. We cover the full product lifecycle.
              </p>
            </div>
          </AnimatedReveal>
        </Container>
      </Section>

      <Section variant="muted">
        <Container>
          <div class="space-y-20">
            {services.map((s: Service, i: number) => (
              <AnimatedReveal key={s.id} delay={i * 60}>
                <article
                  id={s.slug}
                  class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/75 p-8 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none sm:p-10 lg:p-12"
                >
                  <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                    {s.name}
                  </h2>
                  <p class="mt-2 text-lg text-primary-600 dark:text-primary-400">
                    {s.shortDescription}
                  </p>
                  <p class="mt-4 text-slate-600 dark:text-slate-400">
                    {s.description}
                  </p>
                  {s.process && s.process.length > 0 && (
                    <div class="mt-8">
                      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Our process
                      </h3>
                      <ol class="mt-4 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300" role="list">
                        {s.process.map((step: string, j: number) => (
                          <li key={j}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {s.deliverables && s.deliverables.length > 0 && (
                    <div class="mt-8">
                      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Deliverables
                      </h3>
                      <ul class="mt-4 flex flex-wrap gap-2" role="list">
                        {s.deliverables.map((d: string, j: number) => (
                          <li key={j}>
                            <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {d}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </AnimatedReveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
});

export const head: DocumentHead = () => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  return {
    title: `Services | ${config.branding.name}`,
    meta: [
      {
        name: 'description',
        content: 'Web development, Android, iOS, cross-platform, UI/UX design, and API/backend services.',
      },
      { property: 'og:title', content: `Services | ${config.branding.name}` },
      { property: 'og:url', content: `${baseUrl}/services` },
    ],
    links: [{ rel: 'canonical', href: `${baseUrl}/services` }],
  };
};
