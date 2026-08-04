import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { Button } from '~/components/marketing/Button';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import { TestimonialGrid } from '~/components/marketing/TestimonialGrid';
import { BlogCard } from '~/components/marketing/BlogCard';
import { resolveServiceIconUrl } from '~/lib/marketing/service-icons';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import { marketingRoutes } from '~/lib/marketing/constants';
import type { CaseStudy, Testimonial, BlogPost, Service } from '~/lib/marketing/types';

function settingString(settings: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const v = settings?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function settingInt(settings: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const v = settings?.[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function settingOptionalString(settings: Record<string, unknown> | undefined, key: string): string {
  const v = settings?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

export type HomeSectionSharedProps = {
  settings?: Record<string, unknown>;
  uiLocale: string;
};

export const HeroHomeSection = component$<HomeSectionSharedProps>(({ settings, uiLocale }) => {
  const routes = marketingRoutes(uiLocale);
  const headline = settingString(settings, 'headline', 'We build web, Android & iOS apps that scale');
  const subheadline = settingString(
    settings,
    'subheadline',
    'From MVPs to enterprise products. Modern stack, clear process, and long-term support.',
  );
  const primaryCta = settingString(settings, 'primary_cta_label', 'Get in touch');
  const secondaryCta = settingString(settings, 'secondary_cta_label', 'View our work');
  const imageRaw = settingString(settings, 'image', '/hero-banner.webp');
  const imageMobileRaw = settingString(settings, 'image_mobile', '/hero-banner-mobile.webp');
  const image = resolveLaravelMediaUrl(imageRaw) || imageRaw;
  const imageMobile = resolveLaravelMediaUrl(imageMobileRaw) || imageMobileRaw;
  const imageAlt = settingOptionalString(settings, 'image_alt') || headline;

  return (
    <Section class="relative overflow-hidden bg-gradient-to-b from-primary-50/70 via-white to-white pt-12 sm:pt-16 lg:pt-20 dark:from-primary-950/25 dark:via-slate-900 dark:to-slate-900">
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-400/25 blur-3xl dark:bg-primary-500/15"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-900/25"
        aria-hidden="true"
      />
      <Container class="relative">
        <div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-xl lg:text-start">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
              <p class="mt-6 text-lg text-slate-600 dark:text-slate-300 sm:text-xl">{subheadline}</p>
              <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Button href={routes.contact} variant="primary" class="min-w-[180px]">
                  {primaryCta}
                </Button>
                <Button href={routes.work} variant="outline" class="min-w-[180px]">
                  {secondaryCta}
                </Button>
              </div>
            </div>
          </AnimatedReveal>
          <AnimatedReveal delay={100}>
            <div class="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
              <picture>
                <source media="(max-width: 1023px)" srcset={imageMobile} type="image/webp" />
                <img
                  src={image}
                  width={1400}
                  height={788}
                  alt={imageAlt}
                  class="h-auto w-full rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/[0.08] ring-1 ring-slate-900/5 dark:border-slate-600/40 dark:shadow-primary-950/35 dark:ring-white/10"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
            </div>
          </AnimatedReveal>
        </div>
      </Container>
    </Section>
  );
});

export const ServicesTeaserHomeSection = component$<
  HomeSectionSharedProps & { services: Service[] }
>(({ settings, uiLocale, services }) => {
  if (services.length === 0) return null;
  const routes = marketingRoutes(uiLocale);
  const limit = settingInt(settings, 'limit', 6);
  const eyebrow = settingString(settings, 'eyebrow', 'Capabilities');
  const title = settingString(settings, 'title', 'What we do');
  const subtitle = settingString(
    settings,
    'subtitle',
    'Full-stack development for web and mobile — from interfaces to APIs and app stores.',
  );

  return (
    <Section variant="muted" class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-primary-400/15 blur-3xl dark:bg-primary-500/10"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-600/15"
        aria-hidden="true"
      />
      <Container class="relative">
        <AnimatedReveal>
          <div class="mx-auto max-w-2xl text-center">
            <p class="text-sm font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {eyebrow}
            </p>
            <h2 class="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
        </AnimatedReveal>
        <ul
          class="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
          role="list"
        >
          {services.slice(0, limit).map((s, i) => (
            <li key={s.id}>
              <AnimatedReveal delay={i * 70}>
                <Link
                  href={routes.serviceSlug(s.slug)}
                  class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary-300/70 hover:shadow-xl hover:shadow-primary-500/10 dark:border-slate-600/50 dark:bg-slate-800/55 dark:backdrop-blur-none dark:hover:border-primary-500/40 dark:hover:shadow-primary-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:p-7"
                >
                  <div
                    class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    <div class="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary-500/0 via-primary-400/5 to-sky-500/10 dark:via-primary-500/10 dark:to-sky-500/5" />
                  </div>
                  <div class="relative flex flex-1 flex-col">
                    <div class="mb-5 flex items-start justify-between gap-4">
                      <div
                        class="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-sky-50 shadow-inner ring-1 ring-primary-200/40 dark:from-primary-950/60 dark:to-slate-900 dark:ring-primary-500/25"
                        aria-hidden="true"
                      >
                        <div class="absolute inset-1 rounded-xl bg-white/60 dark:bg-slate-900/40" />
                        <img
                          src={resolveServiceIconUrl(s)}
                          alt=""
                          width={56}
                          height={56}
                          decoding="async"
                          class="relative z-[1] h-14 w-14 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <span class="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50/80 text-slate-400 transition-all duration-300 group-hover:border-primary-200 group-hover:bg-primary-50 group-hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:border-primary-500/30 dark:group-hover:bg-primary-950/50 dark:group-hover:text-primary-400">
                        <svg
                          class="h-4 w-4 -rotate-45 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:rotate-45"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </span>
                    </div>
                    <h3 class="text-start text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{s.name}</h3>
                    <p class="mt-2 flex-1 text-start text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {s.shortDescription}
                    </p>
                    <p class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 opacity-0 transition-all duration-300 group-hover:opacity-100 dark:text-primary-400">
                      View details
                      <span class="inline-block transition-transform group-hover:translate-x-1 rtl:-scale-x-100">
                        →
                      </span>
                    </p>
                  </div>
                </Link>
              </AnimatedReveal>
            </li>
          ))}
        </ul>
        <div class="mt-12 text-center">
          <Button href={routes.services} variant="outline" class="min-w-[200px]">
            All services
          </Button>
        </div>
      </Container>
    </Section>
  );
});

export const CaseStudiesHomeSection = component$<
  HomeSectionSharedProps & { caseStudies: CaseStudy[] }
>(({ settings, uiLocale, caseStudies }) => {
  if (caseStudies.length === 0) return null;
  const routes = marketingRoutes(uiLocale);
  const title = settingString(settings, 'title', 'Selected work');
  const subtitle = settingString(settings, 'subtitle', 'Recent projects we are proud of.');

  return (
    <Section>
      <Container>
        <AnimatedReveal>
          <div class="flex items-end justify-between gap-4">
            <div class="min-w-0 text-start">
              <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {title}
              </h2>
              <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
            </div>
            <Link
              href={routes.work}
              class="hidden shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 sm:block"
            >
              View all
            </Link>
          </div>
        </AnimatedReveal>
        <ul class="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {caseStudies.map((cs, i) => (
            <li key={cs.id}>
              <AnimatedReveal delay={i * 100}>
                <CaseStudyCard caseStudy={cs} />
              </AnimatedReveal>
            </li>
          ))}
        </ul>
        <div class="mt-8 text-center sm:hidden">
          <Button href={routes.work} variant="outline">
            View all work
          </Button>
        </div>
      </Container>
    </Section>
  );
});

export const TestimonialsHomeSection = component$<{
  settings?: Record<string, unknown>;
  testimonials: Testimonial[];
}>(({ settings, testimonials }) => {
  if (testimonials.length === 0) return null;
  const title = settingString(settings, 'title', 'What our clients say');
  const subtitle = settingString(settings, 'subtitle', 'Trusted by startups and enterprises.');
  const limit = settingInt(settings, 'limit', 6);

  return (
    <Section variant="muted">
      <TestimonialGrid
        testimonials={testimonials.slice(0, limit)}
        title={title}
        subtitle={subtitle}
      />
    </Section>
  );
});

export const TechStackHomeSection = component$<{
  settings?: Record<string, unknown>;
  techStack: string[];
}>(({ settings, techStack }) => {
  if (techStack.length === 0) return null;
  const eyebrow = settingString(settings, 'eyebrow', 'Built with');

  return (
    <Section class="py-12">
      <Container>
        <AnimatedReveal>
          <p class="text-center text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
          <div class="mt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {techStack.map((tech) => (
              <span key={tech} class="text-lg font-medium text-slate-700 dark:text-slate-300">
                {tech}
              </span>
            ))}
          </div>
        </AnimatedReveal>
      </Container>
    </Section>
  );
});

export const BlogPreviewHomeSection = component$<
  HomeSectionSharedProps & { blogPosts: BlogPost[] }
>(({ settings, uiLocale, blogPosts }) => {
  if (blogPosts.length === 0) return null;
  const routes = marketingRoutes(uiLocale);
  const title = settingString(settings, 'title', 'From the blog');
  const subtitle = settingString(settings, 'subtitle', 'Tips and updates from our team.');

  return (
    <Section variant="muted">
      <Container>
        <AnimatedReveal>
          <div class="flex items-end justify-between gap-4">
            <div class="min-w-0 text-start">
              <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {title}
              </h2>
              <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
            </div>
            <Link
              href={routes.blog}
              class="hidden shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 sm:block"
            >
              All posts
            </Link>
          </div>
        </AnimatedReveal>
        <ul class="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {blogPosts.map((post, i) => (
            <li key={post.slug}>
              <AnimatedReveal delay={i * 80}>
                <BlogCard post={post} />
              </AnimatedReveal>
            </li>
          ))}
        </ul>
        <div class="mt-8 text-center sm:hidden">
          <Button href={routes.blog} variant="outline">
            All posts
          </Button>
        </div>
      </Container>
    </Section>
  );
});

export const CtaHomeSection = component$<HomeSectionSharedProps>(({ settings, uiLocale }) => {
  const routes = marketingRoutes(uiLocale);
  const title = settingString(settings, 'title', 'Ready to start your project?');
  const subtitle = settingString(
    settings,
    'subtitle',
    "Tell us about your idea. We'll get back within 24 hours.",
  );
  const buttonLabel = settingString(settings, 'button_label', 'Get in touch');

  return (
    <Section>
      <Container>
        <AnimatedReveal>
          <div class="mx-auto max-w-2xl rounded-2xl bg-primary-600 px-6 py-12 text-center dark:bg-primary-700 sm:px-12 sm:py-16">
            <h2 class="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
            <p class="mt-4 text-primary-100">{subtitle}</p>
            <div class="mt-8">
              <Button
                href={routes.contact}
                variant="secondary"
                class="bg-white text-primary-600 hover:bg-primary-50 dark:bg-white dark:text-primary-700 dark:hover:bg-primary-100"
              >
                {buttonLabel}
              </Button>
            </div>
          </div>
        </AnimatedReveal>
      </Container>
    </Section>
  );
});
