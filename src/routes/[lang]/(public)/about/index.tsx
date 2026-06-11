import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { buildCanonicalHref } from '~/lib/seo/canonical-url';
import { usePublicShell } from '../layout';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { AnimatedCounter } from '~/components/marketing/AnimatedCounter';

export default component$(() => {
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
              <p class="mt-6 text-xl text-slate-600 dark:text-slate-400">
                {tagline}
              </p>
              {mission && (
                <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                  {mission}
                </p>
              )}
            </div>
          </AnimatedReveal>
        </Container>
      </Section>

      {stats.length > 0 && (
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
      )}

      {values.length > 0 && (
        <Section>
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Our values
              </h2>
              <ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
                {values.map((v: string, i: number) => (
                  <li key={i} class="rounded-xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none">
                    {v}
                  </li>
                ))}
              </ul>
            </AnimatedReveal>
          </Container>
        </Section>
      )}

      {processTimeline.length > 0 && (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                How we work
              </h2>
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
      )}

      {team.length > 0 && (
        <Section>
          <Container>
            <AnimatedReveal>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                The team
              </h2>
              <ul class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {team.map((member: { name: string; role: string; bio?: string }, i: number) => (
                  <li key={i} class="rounded-xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none">
                    <p class="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p class="text-sm text-primary-600 dark:text-primary-400">{member.role}</p>
                    {member.bio && <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{member.bio}</p>}
                  </li>
                ))}
              </ul>
            </AnimatedReveal>
          </Container>
        </Section>
      )}
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const config = getConfig();
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  return {
    title: `About | ${config.branding.name}`,
    meta: [
      { name: 'description', content: 'Learn about our team, values, and how we build digital products.' },
      { property: 'og:title', content: `About | ${config.branding.name}` },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  };
};
