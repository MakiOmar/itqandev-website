import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { FormRenderer } from '~/components/marketing/forms/FormRenderer';
import { useTranslate } from '~/lib/i18n/useTranslate';

export default component$(() => {
  const shell = usePublicShell();
  const { lang } = useTranslate();
  const contact = shell.value.siteContent?.contact;

  return (
    <>
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
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) =>
  publicListPageHead({
    resolveValue,
    url,
    title: 'Contact',
    description: 'Get in touch with our team.',
  });
