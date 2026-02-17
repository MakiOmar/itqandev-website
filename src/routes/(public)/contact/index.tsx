import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getSiteContent } from '~/lib/marketing/content-layer';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { marketingPost } from '~/lib/marketing/api-client';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { Button } from '~/components/marketing/Button';

export const useContactData = routeLoader$(async () => getSiteContent());

function getContactUrl(): string {
  const base = (import.meta.env?.VITE_API_BASE_URL as string) || '';
  const contactUrl = (import.meta.env?.VITE_CONTACT_API_URL as string) || '';
  if (contactUrl) return contactUrl;
  return base ? `${base.replace(/\/$/, '')}${MARKETING_ENDPOINTS.contact}` : '';
}

export default component$(() => {
  const data = useContactData();
  const contact = data.value?.contact;
  const submitting = useSignal(false);
  const submitted = useSignal(false);
  const error = useSignal<string | null>(null);

  const submit = $(async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const url = getContactUrl();
    if (!url) {
      submitted.value = true;
      if (typeof console !== 'undefined') console.info('Contact form: backend endpoint not configured (VITE_CONTACT_API_URL or VITE_API_BASE_URL + /api/contact). See README for required backend shape.');
      return;
    }

    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      subject: fd.get('subject'),
      message: fd.get('message'),
    };

    submitting.value = true;
    error.value = null;
    try {
      await marketingPost(url, body);
      submitted.value = true;
      form.reset();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    } finally {
      submitting.value = false;
    }
  });

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
              {/* Form */}
              <AnimatedReveal delay={80}>
                {submitted.value ? (
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800/50">
                    <p class="font-medium text-slate-900 dark:text-white">Thank you for your message.</p>
                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      We&apos;ll get back to you as soon as we can.
                    </p>
                  </div>
                ) : (
                  <form onSubmit$={submit} class="space-y-6">
                    <div>
                      <label for="contact-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        autocomplete="name"
                        class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label for="contact-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        autocomplete="email"
                        class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label for="contact-subject" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        name="subject"
                        type="text"
                        required
                        class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label for="contact-message" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        required
                        class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    {error.value && (
                      <p class="text-sm text-red-600 dark:text-red-400" role="alert">
                        {error.value}
                      </p>
                    )}
                    <Button type="submit" variant="primary" class="min-w-[140px]" disabled={submitting.value}>
                      {submitting.value ? 'Sending…' : 'Send message'}
                    </Button>
                  </form>
                )}
              </AnimatedReveal>

              {/* Office info */}
              <AnimatedReveal delay={120}>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800/50">
                  <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Office</h2>
                  {contact?.address && (
                    <p class="mt-2 text-slate-600 dark:text-slate-400">{contact.address}</p>
                  )}
                  {contact?.email && (
                    <p class="mt-4">
                      <a href={`mailto:${contact.email}`} class="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact?.phone && (
                    <p class="mt-2">
                      <a href={`tel:${contact.phone.replace(/\s/g, '')}`} class="font-medium text-slate-700 dark:text-slate-300">
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
                        <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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

export const head: DocumentHead = () => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  return {
    title: `Contact | ${config.branding.name}`,
    meta: [
      { name: 'description', content: 'Get in touch for your next web or mobile project.' },
      { property: 'og:title', content: `Contact | ${config.branding.name}` },
      { property: 'og:url', content: `${baseUrl}/contact` },
    ],
    links: [{ rel: 'canonical', href: `${baseUrl}/contact` }],
  };
};
