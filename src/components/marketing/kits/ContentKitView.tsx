import { component$, useSignal } from '@builder.io/qwik';
import { FAQ } from '~/components/marketing/FAQ';
import { AnimatedCounter } from '~/components/marketing/AnimatedCounter';
import { Button } from '~/components/marketing/Button';
import { Card } from '~/components/marketing/Card';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { marketingRoutes } from '~/lib/marketing/constants';

export type ContentKitProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
  pageContext?: { title: string; slug?: string };
};

function str(s: Record<string, unknown>, key: string, fallback = ''): string {
  const v = s[key];
  return typeof v === 'string' ? v : v != null ? String(v) : fallback;
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
      return <FAQ items={items} title={str(s, 'title', 'Frequently asked questions')} />;
    }
    case 'stats': {
      const items = Array.isArray(s.items)
        ? (s.items as Array<{ value?: number; label?: string }>)
        : [];
      if (!items.length) return null;
      return (
        <Section>
          <Container>
            {str(s, 'title') ? (
              <h2 class="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-white">
                {str(s, 'title')}
              </h2>
            ) : null}
            <div class="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {items.map((it, i) => (
                <AnimatedCounter key={i} value={Number(it.value) || 0} label={String(it.label || '')} />
              ))}
            </div>
          </Container>
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
      const email = str(s, 'email');
      const phone = str(s, 'phone');
      const cal = str(s, 'calendar_link');
      return (
        <Section variant="muted">
          <Container>
            <Card>
              <div class="space-y-3 p-6">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {str(s, 'office_heading', 'Office')}
                </h3>
                {str(s, 'address') ? (
                  <p class="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {str(s, 'address')}
                  </p>
                ) : null}
                {email ? (
                  <p>
                    <a class="text-primary-600 hover:underline dark:text-primary-400" href={`mailto:${email}`} dir="ltr">
                      {email}
                    </a>
                  </p>
                ) : null}
                {phone ? (
                  <p>
                    <a
                      class="text-primary-600 hover:underline dark:text-primary-400"
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      dir="ltr"
                    >
                      {phone}
                    </a>
                  </p>
                ) : null}
                {cal ? (
                  <Button href={cal} variant="outline">
                    {str(s, 'calendar_label', 'Book a call')}
                  </Button>
                ) : null}
              </div>
            </Card>
          </Container>
        </Section>
      );
    }
    case 'image_text': {
      const image = str(s, 'image');
      const left = str(s, 'image_position', 'right') === 'left';
      return (
        <Section>
          <Container>
            <div class={`grid items-center gap-10 lg:grid-cols-2 ${left ? '' : ''}`}>
              <div class={left ? 'lg:order-1' : 'lg:order-2'}>
                {image ? (
                  <img src={image} alt={str(s, 'image_alt') || ''} class="w-full rounded-xl object-cover" loading="lazy" />
                ) : null}
              </div>
              <div class={left ? 'lg:order-2' : 'lg:order-1'}>
                {str(s, 'eyebrow') ? (
                  <p class="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {str(s, 'eyebrow')}
                  </p>
                ) : null}
                <h2 class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{str(s, 'title')}</h2>
                <div
                  class="prose prose-slate mt-4 dark:prose-invert"
                  dangerouslySetInnerHTML={str(s, 'body')}
                />
                {str(s, 'button_label') && str(s, 'button_url') ? (
                  <div class="mt-6">
                    <Button href={str(s, 'button_url')} variant="primary">
                      {str(s, 'button_label')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Container>
        </Section>
      );
    }
    case 'timeline': {
      const items = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [];
      return (
        <Section>
          <Container>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{str(s, 'title', 'How we work')}</h2>
            <ol class="mt-8 space-y-6 border-s border-slate-200 ps-6 dark:border-slate-700">
              {items.map((it, i) => (
                <li key={i} class="relative">
                  <span class="absolute -start-[1.6rem] top-1 h-3 w-3 rounded-full bg-primary-500" />
                  <h3 class="font-semibold text-slate-900 dark:text-white">{String(it.title || '')}</h3>
                  <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{String(it.description || '')}</p>
                </li>
              ))}
            </ol>
          </Container>
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
      return (
        <Section>
          <Container>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{str(s, 'title')}</h2>
            <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, i) => (
                <div key={i} class="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
                  <h3 class="font-semibold text-slate-900 dark:text-white">{String(it.title || '')}</h3>
                  <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{String(it.description || '')}</p>
                </div>
              ))}
            </div>
          </Container>
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
      return (
        <Section variant="muted">
          <Container>
            {showCrumbs ? (
              <nav aria-label="Breadcrumb" class="mb-4">
                <ol class="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  {crumbs.map((c, i) => (
                    <li key={i} class="flex items-center gap-1">
                      {i > 0 ? <span aria-hidden="true">/</span> : null}
                      {c.href && i < crumbs.length - 1 ? (
                        <a href={c.href} class="hover:text-primary-600 dark:hover:text-primary-400">
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
            ) : null}
            {showTitle ? (
              <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {pageTitle}
              </h1>
            ) : null}
            {str(s, 'subtitle') ? (
              <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{str(s, 'subtitle')}</p>
            ) : null}
          </Container>
        </Section>
      );
    }
    default:
      return null;
  }
});
