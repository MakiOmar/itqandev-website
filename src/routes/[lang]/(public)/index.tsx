import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { buildCanonicalHref, getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import { getFeaturedCaseStudies, getTestimonials, getBlogPosts } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { resolveServiceIconUrl } from '~/lib/marketing/service-icons';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { Button } from '~/components/marketing/Button';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import { TestimonialGrid } from '~/components/marketing/TestimonialGrid';
import { BlogCard } from '~/components/marketing/BlogCard';
import { usePublicShell } from './layout';

export const useHomeData = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  const [caseStudies, testimonials, blogPosts] = await Promise.all([
    getFeaturedCaseStudies(3, uiLocale, fetchContext),
    getTestimonials(uiLocale, fetchContext),
    getBlogPosts(),
  ]);
  return { caseStudies, testimonials, blogPosts: blogPosts.slice(0, 3) };
});

export default component$(() => {
  const loc = useLocation();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const MR = marketingRoutes(uiLocale);
  const data = useHomeData();
  const shell = usePublicShell();
  const config = getConfig();
  const { caseStudies, testimonials, blogPosts } = data.value;
  const siteContent = shell.value.siteContent;
  const services = siteContent?.services ?? [];
  const techStack = siteContent?.techStack ?? [];
  const branding = shell.value.branding;
  const showTestimonials =
    isFeatureModuleEnabled(branding.features, 'testimonials') && testimonials.length > 0;

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
                  <Button href={MR.contact} variant="primary" class="min-w-[180px]">
                    Get in touch
                  </Button>
                  <Button href={MR.work} variant="outline" class="min-w-[180px]">
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

      {/* Services teaser — custom icons from /public/icons */}
      {services.length > 0 && (
        <Section variant="muted" class="relative overflow-hidden">
          {/* Decorative glows */}
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
                  Capabilities
                </p>
                <h2 class="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
                  What we do
                </h2>
                <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                  Full-stack development for web and mobile — from interfaces to APIs and app stores.
                </p>
              </div>
            </AnimatedReveal>
            <ul
              class="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
              role="list"
            >
              {services.slice(0, 6).map((s, i) => (
                <li key={s.id}>
                  <AnimatedReveal delay={i * 70}>
                    <Link
                      href={MR.serviceSlug(s.slug)}
                      class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary-300/70 hover:shadow-xl hover:shadow-primary-500/10 dark:border-slate-600/50 dark:bg-slate-800/55 dark:backdrop-blur-none dark:hover:border-primary-500/40 dark:hover:shadow-primary-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:p-7"
                    >
                      {/* Sheen on hover */}
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
                        <h3 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                          {s.name}
                        </h3>
                        <p class="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
              <Button href={MR.services} variant="outline" class="min-w-[200px]">
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
                  href={MR.work}
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
              <Button href={MR.work} variant="outline">
                View all work
              </Button>
            </div>
          </Container>
        </Section>
      )}

      {/* Testimonials */}
      {showTestimonials && (
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
                  href={MR.blog}
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
              <Button href={MR.blog} variant="outline">
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
                  href={MR.contact}
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
          url: getPublicSiteBaseUrl(),
          description: 'Web, Android & iOS development agency.',
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const config = getConfig();
  const canonical = buildCanonicalHref(url.pathname, url.origin);
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
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  };
};
