import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { getServiceBySlug } from '~/lib/marketing/content-layer';
import type { Service as MarketingService } from '~/lib/marketing/types';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { resolveServiceIconUrl } from '~/lib/marketing/service-icons';
import { marketingEntityDetailHead } from '~/lib/marketing/marketing-entity-document-head';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';

export const useServiceDetail = routeLoader$(async ({ params, request, fail }) => {
  const slug = decodeURIComponent(String(params.slug ?? '').trim());
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const service = await getServiceBySlug(slug, uiLocale);
  if (!service) {
    return fail(404, { message: 'Service not found' });
  }
  return service;
});

export default component$(() => {
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const raw = useServiceDetail().value as unknown;
  if (
    raw == null ||
    typeof raw !== 'object' ||
    (raw as { failed?: boolean }).failed === true ||
    typeof (raw as MarketingService).slug !== 'string'
  ) {
    return null;
  }
  const s = raw as MarketingService;
  const baseUrl = getPublicSiteBaseUrl();

  return (
    <>
      <Section>
        <Container size="narrow">
          <AnimatedReveal>
            <Link
              href={MR.services}
              class="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <svg class="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to services
            </Link>
          </AnimatedReveal>

          <article class="mt-8">
            <AnimatedReveal delay={60}>
              <header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
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
                    class="relative z-[1] h-14 w-14 object-contain drop-shadow-sm"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{s.name}</h1>
                  <p class="mt-2 text-lg text-primary-600 dark:text-primary-400">{s.shortDescription}</p>
                </div>
              </header>
              <p class="mt-6 text-slate-600 dark:text-slate-400">{s.description}</p>
              {s.process && s.process.length > 0 && (
                <div class="mt-8">
                  <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Our process</h2>
                  <ol class="mt-4 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300" role="list">
                    {s.process.map((step: string, j: number) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {s.deliverables && s.deliverables.length > 0 && (
                <div class="mt-8">
                  <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Deliverables</h2>
                  <ul class="mt-4 flex flex-wrap gap-2" role="list">
                    {s.deliverables.map((d: string, j: number) => (
                      <li key={j}>
                        <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {d}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AnimatedReveal>
          </article>
        </Container>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: 'Services', item: baseUrl + '/services' },
            { '@type': 'ListItem', position: 3, name: s.name },
          ],
        })}
      />
      {/* <!-- Optional JSON-LD from CMS seo_meta.schema --> */}
      {s.seoMeta?.schema != null ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={JSON.stringify(s.seoMeta.schema)} />
      ) : null}
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const config = getConfig();
  const baseUrl = getPublicSiteBaseUrl(url.origin).replace(/\/$/, '');
  try {
    const s = resolveValue(useServiceDetail) as MarketingService;
    if (!s?.slug || typeof s.name !== 'string') {
      throw new Error('Invalid service');
    }
    const description = s.shortDescription || s.description || '';
    return marketingEntityDetailHead({
      brandName: config.branding.name,
      baseUrl,
      sectionLabel: 'Services',
      sectionPath: 'services',
      slug: s.slug,
      defaultTitle: s.name,
      defaultDescription: description,
      seo: s.seoMeta,
    });
  } catch {
    return {
      title: `404 | ${config.branding.name}`,
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  }
};
