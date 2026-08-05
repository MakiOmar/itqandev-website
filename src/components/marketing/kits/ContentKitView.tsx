import { component$, useSignal } from '@builder.io/qwik';
import { FAQ } from '~/components/marketing/FAQ';
import { AnimatedCounter } from '~/components/marketing/AnimatedCounter';
import { Button } from '~/components/marketing/Button';
import { Card } from '~/components/marketing/Card';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { marketingRoutes } from '~/lib/marketing/constants';
import { withUiLocale } from '~/lib/i18n/ui-locale-path';
import type { ContactInfo } from '~/lib/marketing/types';
import { translateApp } from '~/lib/i18n/useTranslate';

export type ContentKitProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
  pageContext?: { title: string; slug?: string };
  /** When true (CMS page layout columns), skip outer Section/Container wrappers. */
  embedded?: boolean;
  /** Site-wide contact block for `use_site_contact` on contact_info kit. */
  siteContact?: ContactInfo | null;
};

function str(s: Record<string, unknown>, key: string, fallback = ''): string {
  const v = s[key];
  return typeof v === 'string' ? v : v != null ? String(v) : fallback;
}

/** Prefix in-app paths with the active UI locale; leave absolute/external URLs alone. */
function localizeHref(uiLocale: string, href: string): string {
  const trimmed = href.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return withUiLocale(uiLocale, trimmed);
  }
  return trimmed;
}

function truthySetting(v: unknown, defaultTrue = false): boolean {
  if (v === undefined || v === null || v === '') return defaultTrue;
  return v === true || v === 'true' || v === 1 || v === '1';
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * New content Kits (faq, stats, pricing, …) beyond legacy HomeSections.
 */
export const ContentKitView = component$<ContentKitProps>((props) => {
  const s = props.settings;
  switch (props.type) {
    case 'faq': {
      const items = Array.isArray(s.items)
        ? (s.items as Array<{ question?: string; answer?: string }>).map((it) => ({
            question: String(it.question ?? ''),
            answer: String(it.answer ?? ''),
          }))
        : [];
      if (props.embedded) {
        if (!items.length) return null;
        const title = str(s, 'title', 'Frequently asked questions');
        return (
          <AnimatedReveal>
            <div
              class="rounded-3xl border border-slate-200/70 bg-slate-50/60 p-6 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/40 dark:backdrop-blur-none sm:p-8"
              aria-labelledby="faq-heading-embedded"
            >
              <h2
                id="faq-heading-embedded"
                class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
              >
                {title}
              </h2>
              <ul class="mt-8 space-y-3" role="list">
                {items.map((item, i) => (
                  <li key={i}>
                    <details class="group rounded-xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md transition open:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:backdrop-blur-none">
                      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
                        <span>{item.question}</span>
                        <span class="ml-2 shrink-0 text-primary-600 transition-transform group-open:rotate-180 dark:text-primary-400" aria-hidden="true">
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </summary>
                      <div class="border-t border-slate-100 px-5 py-4 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                        {item.answer}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedReveal>
        );
      }
      return <FAQ items={items} title={str(s, 'title', 'Frequently asked questions')} />;
    }
    case 'stats': {
      const items = Array.isArray(s.items)
        ? (s.items as Array<{ value?: number; label?: string }>)
        : [];
      if (!items.length) return null;
      const title = str(s, 'title');
      const inner = (
        <AnimatedReveal>
          <div class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 px-6 py-10 shadow-sm dark:border-slate-700/70 dark:from-primary-950/40 dark:via-slate-900 dark:to-slate-900 sm:px-10 sm:py-12">
            <div
              class="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-500/10"
              aria-hidden="true"
            />
            {title ? (
              <h2 class="relative mb-10 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {title}
              </h2>
            ) : null}
            <div class="relative grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
              {items.map((it, i) => (
                <AnimatedCounter key={i} value={Number(it.value) || 0} label={String(it.label || '')} />
              ))}
            </div>
          </div>
        </AnimatedReveal>
      );
      if (props.embedded) return inner;
      return (
        <Section>
          <Container>{inner}</Container>
        </Section>
      );
    }
    case 'pricing': {
      const tiers = Array.isArray(s.tiers) ? (s.tiers as Array<Record<string, unknown>>) : [];
      return (
        <Section>
          <Container>
            <div class="mx-auto max-w-2xl text-center">
              <h2 class="text-3xl font-bold text-slate-900 dark:text-white">{str(s, 'title', 'Pricing')}</h2>
              {str(s, 'subtitle') ? (
                <p class="mt-3 text-slate-600 dark:text-slate-300">{str(s, 'subtitle')}</p>
              ) : null}
            </div>
            <div class="mt-10 grid gap-6 lg:grid-cols-3">
              {tiers.map((tier, i) => {
                const highlighted = tier.highlighted === true || tier.highlighted === 'true';
                const features = String(tier.features || '')
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean);
                return (
                  <Card
                    key={i}
                    class={
                      highlighted
                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                        : undefined
                    }
                  >
                    <div class="p-6">
                      {highlighted ? (
                        <span class="mb-2 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
                          Popular
                        </span>
                      ) : null}
                      <h3 class="text-xl font-bold text-slate-900 dark:text-white">
                        {String(tier.name || '')}
                      </h3>
                      <p class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {String(tier.price || '')}
                        {tier.period ? (
                          <span class="text-base font-normal text-slate-500"> / {String(tier.period)}</span>
                        ) : null}
                      </p>
                      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {String(tier.description || '')}
                      </p>
                      <ul class="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        {features.map((f, fi) => (
                          <li key={fi}>✓ {f}</li>
                        ))}
                      </ul>
                      <div class="mt-6">
                        <Button href="/contact" variant={highlighted ? 'primary' : 'outline'} class="w-full">
                          {String(tier.cta || 'Get started')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Container>
        </Section>
      );
    }
    case 'contact_info': {
      const useSite = truthySetting(s.use_site_contact, true);
      const site = props.siteContact;
      const email = str(s, 'email') || (useSite ? String(site?.email || '') : '');
      const phone = str(s, 'phone') || (useSite ? String(site?.phone || '') : '');
      const address = str(s, 'address') || (useSite ? String(site?.address || '') : '');
      const cal =
        str(s, 'calendar_link') || (useSite ? String(site?.calendarLink || '') : '');
      const socialsFromSettings = Array.isArray(s.socials)
        ? (s.socials as Array<Record<string, unknown>>)
            .map((row) => ({
              label: String(row.label ?? row.name ?? '').trim(),
              url: String(row.url ?? '').trim(),
            }))
            .filter((row) => row.url)
        : [];
      const socials =
        socialsFromSettings.length > 0
          ? socialsFromSettings
          : useSite && Array.isArray(site?.socials)
            ? site!.socials!
                .map((row) => ({
                  label: String(row.name || '').trim(),
                  url: String(row.url || '').trim(),
                }))
                .filter((row) => row.url)
            : [];

      const iconWell =
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-sky-50 text-primary-600 shadow-inner ring-1 ring-primary-200/50 dark:from-primary-950/60 dark:to-slate-900 dark:text-primary-300 dark:ring-primary-500/25';

      const card = (
        <div class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm shadow-primary-500/5 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/60 dark:backdrop-blur-none">
          <div
            class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-400/15 blur-3xl dark:bg-primary-500/10"
            aria-hidden="true"
          />
          <div class="relative space-y-6 p-6 sm:p-8">
            <div>
              <h3 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {str(s, 'office_heading', 'Office')}
              </h3>
            </div>

            <ul class="space-y-4" role="list">
              {address ? (
                <li class="flex gap-3">
                  <span class={iconWell} aria-hidden="true">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {translateApp(props.uiLocale, 'contactPage.address')}
                    </p>
                    <p class="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {address}
                    </p>
                  </div>
                </li>
              ) : null}
              {email ? (
                <li class="flex gap-3">
                  <span class={iconWell} aria-hidden="true">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {translateApp(props.uiLocale, 'contactPage.email')}
                    </p>
                    <a
                      class="mt-0.5 block break-words font-medium text-slate-800 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-300"
                      href={`mailto:${email}`}
                      dir="ltr"
                    >
                      {email}
                    </a>
                  </div>
                </li>
              ) : null}
              {phone ? (
                <li class="flex gap-3">
                  <span class={iconWell} aria-hidden="true">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {translateApp(props.uiLocale, 'contactPage.phone')}
                    </p>
                    <a
                      class="mt-0.5 block font-medium text-slate-800 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-300"
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      dir="ltr"
                    >
                      {phone}
                    </a>
                  </div>
                </li>
              ) : null}
            </ul>

            {cal ? (
              <div class="pt-1">
                <Button href={cal} variant="primary" class="w-full sm:w-auto">
                  {str(s, 'calendar_label', 'Book a call')}
                </Button>
              </div>
            ) : null}

            {socials.length > 0 ? (
              <ul class="flex flex-wrap gap-2 border-t border-slate-200/80 pt-5 dark:border-slate-700/80" role="list">
                {socials.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:bg-primary-950/40 dark:hover:text-primary-200"
                      aria-label={item.label || item.url}
                    >
                      {item.label || item.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      );

      if (props.embedded) {
        return <AnimatedReveal delay={120}>{card}</AnimatedReveal>;
      }
      return (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>{card}</AnimatedReveal>
          </Container>
        </Section>
      );
    }
    case 'image_text': {
      const image = str(s, 'image');
      const left = str(s, 'image_position', 'right') === 'left';
      const copy = (
        <div class={image ? (left ? 'lg:order-2' : 'lg:order-1') : 'mx-auto max-w-3xl'}>
          {str(s, 'eyebrow') ? (
            <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {str(s, 'eyebrow')}
            </p>
          ) : null}
          <h2 class="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {str(s, 'title')}
          </h2>
          <div
            class="prose prose-slate mt-5 max-w-none leading-relaxed dark:prose-invert"
            dangerouslySetInnerHTML={str(s, 'body')}
          />
          {str(s, 'button_label') && str(s, 'button_url') ? (
            <div class="mt-8">
              <Button href={localizeHref(props.uiLocale, str(s, 'button_url'))} variant="primary">
                {str(s, 'button_label')}
              </Button>
            </div>
          ) : null}
        </div>
      );
      const body = (
        <AnimatedReveal>
          {image ? (
            <div class="grid items-center gap-10 lg:grid-cols-2">
              <div class={left ? 'lg:order-1' : 'lg:order-2'}>
                <div class="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-700/80 dark:ring-white/5">
                  <img
                    src={image}
                    alt={str(s, 'image_alt') || ''}
                    class="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              {copy}
            </div>
          ) : (
            copy
          )}
        </AnimatedReveal>
      );
      if (props.embedded) return body;
      return (
        <Section>
          <Container>{body}</Container>
        </Section>
      );
    }
    case 'timeline': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      if (!items.length) return null;
      const title = str(s, 'title', 'How we work');
      const subtitle = str(s, 'subtitle');
      const list = (
        <AnimatedReveal>
          <div class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/50 dark:backdrop-blur-none sm:p-10">
            <div
              class="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-900/20"
              aria-hidden="true"
            />
            <div class="relative mx-auto max-w-3xl">
              <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {title}
              </h2>
              {subtitle ? (
                <p class="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {subtitle}
                </p>
              ) : null}
              <ol class="relative mt-10 space-y-0 border-s-2 border-primary-200/80 ps-8 dark:border-primary-800/60" role="list">
                {items.map((it, i) => {
                  const year = String(it.year || '').trim();
                  return (
                    <li key={i} class="relative pb-10 last:pb-0">
                      <span
                        class="absolute -start-[2.55rem] top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-primary-100 dark:bg-slate-900 dark:ring-primary-900/60"
                        aria-hidden="true"
                      >
                        <span class="h-2.5 w-2.5 rounded-full bg-primary-500 shadow shadow-primary-500/40" />
                      </span>
                      {year ? (
                        <p class="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                          {year}
                        </p>
                      ) : null}
                      <h3 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {String(it.title || '')}
                      </h3>
                      <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                        {String(it.description || '')}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </AnimatedReveal>
      );
      if (props.embedded) return list;
      return (
        <Section>
          <Container>{list}</Container>
        </Section>
      );
    }
    case 'team': {
      const members = Array.isArray(s.members) ? (s.members as Array<Record<string, unknown>>) : [];
      return (
        <Section>
          <Container>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{str(s, 'title', 'The team')}</h2>
            <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m, i) => (
                <Card key={i}>
                  <div class="p-5">
                    {m.avatar ? (
                      <img
                        src={String(m.avatar)}
                        alt=""
                        class="mb-3 h-16 w-16 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <h3 class="font-semibold text-slate-900 dark:text-white">{String(m.name || '')}</h3>
                    <p class="text-sm text-primary-600 dark:text-primary-400">{String(m.role || '')}</p>
                    {m.bio ? <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{String(m.bio)}</p> : null}
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      );
    }
    case 'feature_grid': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      if (!items.length) return null;
      const grid = (
        <AnimatedReveal>
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {str(s, 'title')}
            </h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {items.map((it, i) => (
                <div
                  key={i}
                  class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm shadow-primary-500/5 backdrop-blur-md transition hover:border-primary-300/60 dark:border-slate-700/80 dark:bg-slate-800/55 dark:backdrop-blur-none dark:hover:border-primary-500/40"
                >
                  <div
                    class="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary-400/10 blur-2xl transition group-hover:bg-primary-400/20 dark:bg-primary-500/10"
                    aria-hidden="true"
                  />
                  <h3 class="relative text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {String(it.title || '')}
                  </h3>
                  <p class="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {String(it.description || '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedReveal>
      );
      if (props.embedded) return grid;
      return (
        <Section>
          <Container>{grid}</Container>
        </Section>
      );
    }
    case 'logo_cloud': {
      const logos = Array.isArray(s.logos) ? (s.logos as Array<Record<string, unknown>>) : [];
      return (
        <Section variant="muted">
          <Container>
            {str(s, 'title') ? (
              <p class="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
                {str(s, 'title')}
              </p>
            ) : null}
            <div class="flex flex-wrap items-center justify-center gap-8 opacity-80">
              {logos.map((logo, i) => {
                const src = String(logo.image || '');
                if (!src) return null;
                const img = (
                  <img src={src} alt={String(logo.alt || '')} class="h-10 w-auto object-contain" loading="lazy" />
                );
                return logo.url ? (
                  <a key={i} href={String(logo.url)} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  <span key={i}>{img}</span>
                );
              })}
            </div>
          </Container>
        </Section>
      );
    }
    case 'accordion_content': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      return (
        <Section>
          <Container>
            {str(s, 'title') ? (
              <h2 class="mb-6 text-2xl font-bold text-slate-900 dark:text-white">{str(s, 'title')}</h2>
            ) : null}
            <ul class="space-y-3">
              {items.map((it, i) => (
                <li key={i}>
                  <details class="rounded-lg border border-slate-200 dark:border-slate-700">
                    <summary class="cursor-pointer px-4 py-3 font-medium">{String(it.title || '')}</summary>
                    <div class="border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                      {String(it.body || '')}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      );
    }
    case 'tabs_content': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      const active = useSignal(0);
      if (!items.length) return null;
      return (
        <Section>
          <Container>
            <div class="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
              {items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  class={`px-3 py-2 text-sm font-medium ${
                    active.value === i
                      ? 'border-b-2 border-primary-600 text-primary-700 dark:text-primary-300'
                      : 'text-slate-500'
                  }`}
                  onClick$={() => {
                    active.value = i;
                  }}
                >
                  {String(it.title || `Tab ${i + 1}`)}
                </button>
              ))}
            </div>
            <div class="mt-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {String(items[active.value]?.body || '')}
            </div>
          </Container>
        </Section>
      );
    }
    case 'video_cta': {
      const embed = youtubeEmbed(str(s, 'video_url'));
      return (
        <Section>
          <Container>
            <AnimatedReveal>
              <div class="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <h2 class="text-3xl font-bold text-slate-900 dark:text-white">{str(s, 'title')}</h2>
                  {str(s, 'subtitle') ? (
                    <p class="mt-3 text-slate-600 dark:text-slate-300">{str(s, 'subtitle')}</p>
                  ) : null}
                  {str(s, 'button_label') ? (
                    <div class="mt-6">
                      <Button href={str(s, 'button_url', '/contact')} variant="primary">
                        {str(s, 'button_label')}
                      </Button>
                    </div>
                  ) : null}
                </div>
                {embed ? (
                  <div class="relative w-full overflow-hidden rounded-xl pb-[56.25%]">
                    <iframe
                      class="absolute inset-0 h-full w-full"
                      src={embed}
                      title={str(s, 'title', 'Video')}
                      allowFullscreen
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
            </AnimatedReveal>
          </Container>
        </Section>
      );
    }
    case 'page_header': {
      const showTitle =
        s.show_title === true || s.show_title === 'true' || s.show_title === 1 || s.show_title === undefined;
      const showCrumbs =
        s.show_breadcrumbs === true ||
        s.show_breadcrumbs === 'true' ||
        s.show_breadcrumbs === 1 ||
        s.show_breadcrumbs === undefined;
      const routes = marketingRoutes(props.uiLocale);
      const pageTitle =
        str(s, 'title_override').trim() ||
        props.pageContext?.title?.trim() ||
        str(s, 'title').trim() ||
        'Page';
      const homeLabel = str(s, 'home_label', 'Home');
      const eyebrow = str(s, 'eyebrow').trim();
      const extras = Array.isArray(s.extra_crumbs)
        ? (s.extra_crumbs as Array<Record<string, unknown>>)
        : [];
      const crumbs: Array<{ label: string; href?: string }> = [
        { label: homeLabel, href: routes.home },
        ...extras
          .filter((c) => String(c.label || '').trim())
          .map((c) => ({
            label: String(c.label || ''),
            href: String(c.url || '').trim() || undefined,
          })),
        { label: pageTitle },
      ];
      const crumbsNav = showCrumbs ? (
        <nav aria-label="Breadcrumb" class="mb-5">
          <ol class="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            {crumbs.map((c, i) => (
              <li key={i} class="flex items-center gap-1.5">
                {i > 0 ? <span class="text-slate-300 dark:text-slate-600" aria-hidden="true">/</span> : null}
                {c.href && i < crumbs.length - 1 ? (
                  <a href={c.href} class="transition hover:text-primary-600 dark:hover:text-primary-400">
                    {c.label}
                  </a>
                ) : (
                  <span
                    class={
                      i === crumbs.length - 1
                        ? 'font-medium text-slate-800 dark:text-slate-100'
                        : undefined
                    }
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null;

      const headingBlock = (
        <>
          {eyebrow ? (
            <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {eyebrow}
            </p>
          ) : null}
          {showTitle ? (
            <h1 class="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              {pageTitle}
            </h1>
          ) : null}
          {str(s, 'subtitle') ? (
            <p class="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl">
              {str(s, 'subtitle')}
            </p>
          ) : null}
        </>
      );

      if (props.embedded) {
        return (
          <div class="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-b from-primary-50/70 via-white/90 to-white px-6 py-10 shadow-sm dark:border-slate-700/60 dark:from-primary-950/30 dark:via-slate-900 dark:to-slate-900 sm:px-10 sm:py-14">
            <div
              class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-400/25 blur-3xl dark:bg-primary-500/15"
              aria-hidden="true"
            />
            <div
              class="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-900/25"
              aria-hidden="true"
            />
            <div class="relative">
              <AnimatedReveal>
                {crumbsNav}
                {headingBlock}
              </AnimatedReveal>
            </div>
          </div>
        );
      }
      return (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              {crumbsNav}
              {headingBlock}
            </AnimatedReveal>
          </Container>
        </Section>
      );
    }
    default:
      return null;
  }
});
