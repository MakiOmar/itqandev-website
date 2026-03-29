import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getFeaturedCaseStudies, getTestimonials, getSiteContent, getBlogPosts } from '~/lib/marketing/content-layer';
import { MARKETING_ROUTES } from '~/lib/marketing/constants';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { Button } from '~/components/marketing/Button';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import { TestimonialGrid } from '~/components/marketing/TestimonialGrid';
import { BlogCard } from '~/components/marketing/BlogCard';

export const useHomeData = routeLoader$(async () => {
  const [caseStudies, testimonials, siteContent, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(3),
    getTestimonials(),
    getSiteContent(),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, siteContent, blogPosts: blogPosts.slice(0, 3) };
});

export default component$(() => {
  const data = useHomeData();
  const config = getConfig();
  const { caseStudies, testimonials, siteContent, blogPosts } = data.value;
  const services = siteContent?.services ?? [];
  const techStack = siteContent?.techStack ?? [];

  return (
    <>
      {/* Hero — responsive WebP banner + copy; text first in DOM for accessibility/SEO */}
      <Section class="relative overflow-hidden bg-gradient-to-b from-primary-50/70 via-white to-white pt-12 sm:pt-16 lg:pt-20 dark:from-primary-950/25 dark:via-slate-900 dark:to-slate-900">
        {/* Soft accents aligned with primary / sky palette */}
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
              <div class="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-xl lg:text-left">
                <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                  We build web, Android & iOS apps that scale
                </h1>
                <p class="mt-6 text-lg text-slate-600 dark:text-slate-300 sm:text-xl">
                  From MVPs to enterprise products. Modern stack, clear process, and long-term support.
                </p>
                <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                  <Button href={MARKETING_ROUTES.contact} variant="primary" class="min-w-[180px]">
                    Get in touch
                  </Button>
                  <Button href={MARKETING_ROUTES.work} variant="outline" class="min-w-[180px]">
                    View our work
                  </Button>
                </div>
              </div>
            </AnimatedReveal>
            <AnimatedReveal delay={100}>
              <div class="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
                <picture>
                  <source media="(max-width: 1023px)" srcset="/hero-banner-mobile.webp" type="image/webp" />
                  <img
                    src="/hero-banner.webp"
                    width={1400}
                    height={788}
                    alt="Credocode — web, Android and iOS products built to scale"
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

      {/* Services teaser */}
      {services.length > 0 && (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  What we do
                </h2>
                <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">
                  Full-stack development for web and mobile.
                </p>
              </div>
            </AnimatedReveal>
            <ul class="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {services.slice(0, 6).map((s, i) => (
                <li key={s.id}>
                  <AnimatedReveal delay={i * 80}>
                    <Link
                      href={`${MARKETING_ROUTES.services}#${s.slug}`}
                      class="block rounded-xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{s.name}</h3>
                      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.shortDescription}</p>
                    </Link>
                  </AnimatedReveal>
                </li>
              ))}
            </ul>
            <div class="mt-10 text-center">
              <Button href={MARKETING_ROUTES.services} variant="outline">
                All services
              </Button>
            </div>
          </Container>
        </Section>
      )}

      {/* Case studies preview */}
      {caseStudies.length > 0 && (
        <Section>
          <Container>
            <AnimatedReveal>
              <div class="flex items-end justify-between gap-4">
                <div>
                  <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Selected work
                  </h2>
                  <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    Recent projects we are proud of.
                  </p>
                </div>
                <Link
                  href={MARKETING_ROUTES.work}
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
              <Button href={MARKETING_ROUTES.work} variant="outline">
                View all work
              </Button>
            </div>
          </Container>
        </Section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <Section variant="muted">
          <TestimonialGrid
            testimonials={testimonials.slice(0, 6)}
            title="What our clients say"
            subtitle="Trusted by startups and enterprises."
          />
        </Section>
      )}

      {/* Tech stack band */}
      {techStack.length > 0 && (
        <Section class="py-12">
          <Container>
            <AnimatedReveal>
              <p class="text-center text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Built with
              </p>
              <div class="mt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    class="text-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </AnimatedReveal>
          </Container>
        </Section>
      )}

      {/* Blog preview */}
      {blogPosts.length > 0 && (
        <Section variant="muted">
          <Container>
            <AnimatedReveal>
              <div class="flex items-end justify-between gap-4">
                <div>
                  <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    From the blog
                  </h2>
                  <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    Tips and updates from our team.
                  </p>
                </div>
                <Link
                  href={MARKETING_ROUTES.blog}
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
              <Button href={MARKETING_ROUTES.blog} variant="outline">
                All posts
              </Button>
            </div>
          </Container>
        </Section>
      )}

      {/* CTA */}
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl rounded-2xl bg-primary-600 px-6 py-12 text-center dark:bg-primary-700 sm:px-12 sm:py-16">
              <h2 class="text-2xl font-bold text-white sm:text-3xl">
                Ready to start your project?
              </h2>
              <p class="mt-4 text-primary-100">
                Tell us about your idea. We&apos;ll get back within 24 hours.
              </p>
              <div class="mt-8">
                <Button
                  href={MARKETING_ROUTES.contact}
                  variant="secondary"
                  class="bg-white text-primary-600 hover:bg-primary-50 dark:bg-white dark:text-primary-700 dark:hover:bg-primary-100"
                >
                  Get in touch
                </Button>
              </div>
            </div>
          </AnimatedReveal>
        </Container>
      </Section>

      {/* JSON-LD Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: config.branding.name,
          url: (import.meta.env?.VITE_SITE_URL as string) || '',
          description: 'Web, Android & iOS development agency.',
        })}
      />
    </>
  );
});

export const head: DocumentHead = () => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  return {
    title: `${config.branding.name} | Web, Android & iOS Development`,
    meta: [
      {
        name: 'description',
        content: `We build web, Android and iOS apps that scale. From MVPs to enterprise products. Modern stack, clear process, and long-term support.`,
      },
      { property: 'og:title', content: `${config.branding.name} | Web, Android & iOS Development` },
      { property: 'og:description', content: 'We build web, Android and iOS apps that scale.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: baseUrl + '/' },
    ],
    links: [{ rel: 'canonical', href: baseUrl + '/' }],
  };
};
