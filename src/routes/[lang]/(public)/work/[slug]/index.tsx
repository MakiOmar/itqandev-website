import { component$, useComputed$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { marketingApiPageOriginMismatch } from '~/lib/marketing/api-client';
import { getCaseStudyBySlug } from '~/lib/marketing/content-layer';
import type { CaseStudy as MarketingCaseStudy } from '~/lib/marketing/types';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { Link, useLocation } from '@builder.io/qwik-city';
import { ContentImage } from '~/components/marketing/ContentImage';
import { MarketingImageLightbox } from '~/components/marketing/MarketingImageLightbox';
import { marketingEntityDetailHead } from '~/lib/marketing/marketing-entity-document-head';

/** SSR cannot forward cross-origin Laravel cookies; loaders return this marker for a client retry. */
type DeferredCrossOriginPayload = {
  _deferredCrossOrigin: true;
  slug: string;
  uiLocale?: string;
};

function isMarketingCaseStudyValue(v: unknown): v is MarketingCaseStudy {
  /** Require `title` so deferred `{ slug }` placeholders are not mistaken for full API rows */
  return (
    v != null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    typeof (v as MarketingCaseStudy).slug === 'string' &&
    typeof (v as MarketingCaseStudy).title === 'string'
  );
}

function isDeferredCrossOriginPayload(v: unknown): v is DeferredCrossOriginPayload {
  return (
    v != null &&
    typeof v === 'object' &&
    (v as DeferredCrossOriginPayload)._deferredCrossOrigin === true &&
    typeof (v as DeferredCrossOriginPayload).slug === 'string'
  );
}

export const useCaseStudy = routeLoader$(async ({ params, request, fail }) => {
  const slug = params.slug;
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const forwardAuthorization = request.headers.get('authorization') || '';

  const caseStudy = await getCaseStudyBySlug(slug, uiLocale, {
    forwardCookies: cookie || undefined,
    forwardAuthorization: forwardAuthorization.trim() !== '' ? forwardAuthorization : undefined,
    forwardDocumentUrl: request.url,
  });
  if (caseStudy) {
    return caseStudy;
  }

  /** Cross-origin SSR (e.g. localhost UI + remote Laravel): session jars differ; browser retries with credentials. */
  if (marketingApiPageOriginMismatch(request.url)) {
    return { _deferredCrossOrigin: true, slug, uiLocale } satisfies DeferredCrossOriginPayload;
  }

  return fail(404, { message: 'Case study not found' });
});

export default component$(() => {
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const loader = useCaseStudy();
  const clientCaseStudy = useSignal<MarketingCaseStudy | null>(null);
  const clientRetryPhase = useSignal<'idle' | 'pending' | 'loaded' | 'missing'>('idle');

  useVisibleTask$(async ({ track }) => {
    track(() => loader.value);

    clientCaseStudy.value = null;
    const raw = loader.value as unknown;

    if (!isDeferredCrossOriginPayload(raw)) {
      clientRetryPhase.value = 'idle';
      return;
    }

    clientRetryPhase.value = 'pending';
    try {
      const cs = await getCaseStudyBySlug(raw.slug, raw.uiLocale, undefined);
      if (cs) {
        clientCaseStudy.value = cs;
        clientRetryPhase.value = 'loaded';
        return;
      }
    } catch {
      /* swallow */
    }
    clientRetryPhase.value = 'missing';
  });

  const view = useComputed$(() => {
    const raw = loader.value as unknown;

    if (raw != null && typeof raw === 'object' && (raw as { failed?: boolean }).failed === true) {
      return { kind: 'failed' as const };
    }

    /** Defer marker includes `slug` — must precede slug-only CaseStudy guard */
    if (!isDeferredCrossOriginPayload(raw)) {
      if (isMarketingCaseStudyValue(raw)) {
        return { kind: 'ok' as const, study: raw };
      }
      return { kind: 'empty' as const };
    }

    const phase = clientRetryPhase.value;
    if (phase === 'pending' || phase === 'idle') {
      return { kind: 'loading' as const };
    }

    if (phase === 'missing') {
      return { kind: 'missing' as const };
    }

    const cs = clientCaseStudy.value;
    if (cs && isMarketingCaseStudyValue(cs)) {
      return { kind: 'ok' as const, study: cs };
    }

    return { kind: 'loading' as const };
  });

  const state = view.value;

  if (state.kind === 'failed' || state.kind === 'empty') {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <Section>
        <Container size="narrow">
          {/* Loading draft preview cross-origin */}
          <p class="rounded-md bg-slate-100 px-4 py-6 text-center text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Loading project… If you preview drafts across hosts (e.g. localhost + remote API), sign in via the dashboard on
            that API domain so credentials can attach.
          </p>
        </Container>
      </Section>
    );
  }

  if (state.kind === 'missing') {
    return (
      <Section>
        <Container size="narrow" class="text-center">
          <p class="text-lg text-slate-700 dark:text-slate-200">Case study not found.</p>
          <Link href={MR.work} class="mt-4 inline-block text-primary-600 underline dark:text-primary-400">
            Back to work
          </Link>
        </Container>
      </Section>
    );
  }

  const caseStudy = state.study;

  const baseUrl = getPublicSiteBaseUrl();

  return (
    <>
      <Section>
        <Container size="narrow">
          <AnimatedReveal>
            <Link
              href={MR.work}
              class="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to work
            </Link>
          </AnimatedReveal>

          <article class="mt-8">
            <MarketingImageLightbox>
              <AnimatedReveal delay={60}>
                <div class="aspect-video w-full overflow-hidden rounded-xl bg-slate-100 shadow-lg ring-1 ring-slate-200/70 dark:bg-slate-700 dark:ring-slate-600/50">
                  <ContentImage
                    src={caseStudy.image}
                    alt={caseStudy.imageAlt || caseStudy.title}
                    width={800}
                    height={450}
                    class="h-full w-full object-cover"
                    fetchPriority="high"
                  />
                </div>
              </AnimatedReveal>

              <AnimatedReveal delay={100}>
                {caseStudy.tags && caseStudy.tags.length > 0 && (
                  <ul class="mt-6 flex flex-wrap gap-2" role="list">
                    {caseStudy.tags.map((tag: string) => (
                      <li
                        key={tag}
                        class="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
                <h1 class="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                  {caseStudy.title}
                </h1>
                {/* Non-published status from API appears only when the viewer is authorized on the Laravel public preview route */}
                {caseStudy.status && caseStudy.status !== 'published' && (
                  <p
                    class="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-900/35 dark:text-amber-50"
                    role="status"
                  >
                    Preview: status is "{caseStudy.status}" — visible because you can manage projects (not shown to visitors).
                  </p>
                )}
                <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">{caseStudy.summary}</p>
                {caseStudy.description && (
                  <div
                    class="article-content mt-8 max-w-none [&_img]:rounded-xl [&_img]:shadow-sm"
                    dangerouslySetInnerHTML={caseStudy.description}
                  />
                )}
                <div class="mt-8 flex flex-wrap gap-4">
                  {caseStudy.linkUrl && (
                    <a
                      href={caseStudy.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                    >
                      View project
                      <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  {caseStudy.demoUrl && (
                    <a
                      href={caseStudy.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Demo
                    </a>
                  )}
                  {caseStudy.repoUrl && (
                    <a
                      href={caseStudy.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Repository
                    </a>
                  )}
                </div>
              </AnimatedReveal>
            </MarketingImageLightbox>
          </article>
        </Container>
      </Section>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: 'Work', item: baseUrl + '/work' },
            { '@type': 'ListItem', position: 3, name: caseStudy.title },
          ],
        })}
      />
      {caseStudy.seoMeta?.schema != null ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={JSON.stringify(caseStudy.seoMeta.schema)}
        />
      ) : null}
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const config = getConfig();
  const baseUrl = getPublicSiteBaseUrl(url.origin).replace(/\/$/, '');
  try {
    const caseStudyResolved = resolveValue(useCaseStudy) as MarketingCaseStudy | DeferredCrossOriginPayload;
    if (isDeferredCrossOriginPayload(caseStudyResolved)) {
      return {
        title: `Work | ${config.branding.name}`,
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
      };
    }
    const caseStudy = caseStudyResolved;
    return marketingEntityDetailHead({
      brandName: config.branding.name,
      baseUrl: baseUrl.replace(/\/$/, ''),
      sectionLabel: 'Work',
      sectionPath: 'work',
      slug: caseStudy.slug,
      defaultTitle: caseStudy.title,
      defaultDescription: caseStudy.summary,
      seo: caseStudy.seoMeta,
    });
  } catch {
    return {
      title: `404 | ${config.branding.name}`,
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  }
};
