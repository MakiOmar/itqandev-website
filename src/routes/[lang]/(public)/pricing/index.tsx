import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { buildCanonicalHref } from '~/lib/seo/canonical-url';
import { usePublicShell } from '../layout';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { Button } from '~/components/marketing/Button';
import { Card } from '~/components/marketing/Card';
import { FAQ } from '~/components/marketing/FAQ';
import type { PricingTier } from '~/lib/marketing/types';

export default component$(() => {
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const shell = usePublicShell();
  const tiers = shell.value.siteContent?.pricingTiers ?? [];
  const faq = shell.value.siteContent?.faq ?? [];

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Pricing
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Transparent packages. Custom quotes for larger scope.
              </p>
            </div>
          </AnimatedReveal>

          <div class="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {tiers.map((tier: PricingTier, i: number) => (
              <AnimatedReveal key={tier.id} delay={i * 80}>
                <Card
                  class={`relative flex flex-col ${
                    tier.highlighted
                      ? 'border-2 border-primary-500 shadow-lg dark:border-primary-500'
                      : ''
                  }`}
                  padding="none"
                >
                  {tier.highlighted && (
                    <p class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-medium text-white dark:bg-primary-500">
                      Popular
                    </p>
                  )}
                  <div class="p-6 sm:p-8">
                    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {tier.name}
                    </h2>
                    <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                      {tier.price}
                      {tier.period && (
                        <span class="text-sm font-normal text-slate-500 dark:text-slate-400">
                          {' '}/ {tier.period}
                        </span>
                      )}
                    </p>
                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {tier.description}
                    </p>
                    <ul class="mt-6 space-y-3" role="list">
                      {tier.features.map((f: string, j: number) => (
                        <li key={j} class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div class="mt-8">
                      <Button
                        href={MR.contact}
                        variant={tier.highlighted ? 'primary' : 'outline'}
                        class="w-full justify-center"
                      >
                        {tier.cta}
                      </Button>
                    </div>
                  </div>
                </Card>
              </AnimatedReveal>
            ))}
          </div>

          <p class="mt-12 text-center text-sm text-slate-600 dark:text-slate-400">
            Need something different?{' '}
            <Link href={MR.contact} class="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Request a custom quote
            </Link>
          </p>
        </Container>
      </Section>

      {faq.length > 0 && (
        <Section variant="muted">
          <FAQ items={faq} />
        </Section>
      )}
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const config = getConfig();
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  return {
    title: `Pricing | ${config.branding.name}`,
    meta: [
      { name: 'description', content: 'Transparent pricing for web and mobile development. Custom quotes available.' },
      { property: 'og:title', content: `Pricing | ${config.branding.name}` },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  };
};
