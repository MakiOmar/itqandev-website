import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useLocation } from '@builder.io/qwik-city';
import { getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { publicListPageHead } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import {
  getCaseStudiesPage,
  getPortfolioCategories,
  type CaseStudyListResult,
  type PortfolioCategory,
} from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute, withUiLocale } from '~/lib/i18n/ui-locale-path';
import { translateApp } from '~/lib/i18n/useTranslate';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { CaseStudyCard } from '~/components/marketing/CaseStudyCard';
import type { CaseStudy } from '~/lib/marketing/types';

const PER_PAGE = 12;

function buildWorkHref(
  uiLocale: string,
  opts: { categorySlug?: string | null; page?: number; skillSlug?: string | null },
): string {
  const base = withUiLocale(uiLocale, '/work/');
  const q = new URLSearchParams();
  if (opts.categorySlug) {
    q.set('category_slug', opts.categorySlug);
  }
  if (opts.skillSlug) {
    q.set('skill_slug', opts.skillSlug);
  }
  if (opts.page && opts.page > 1) {
    q.set('page', String(opts.page));
  }
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export const useWorkData = routeLoader$(async ({ request, url, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url) || 'en';
  const categorySlug = url.searchParams.get('category_slug')?.trim() || undefined;
  const skillSlug = url.searchParams.get('skill_slug')?.trim() || undefined;
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const fetchContext = { forwardDocumentUrl: request.url, forwardCookies: cookie };
  const [list, categories] = await Promise.all([
    getCaseStudiesPage(
      uiLocale,
      { categorySlug, skillSlug, page, perPage: PER_PAGE },
      fetchContext,
    ),
    getPortfolioCategories(uiLocale, fetchContext),
  ]);
  return {
    list,
    categories,
    categorySlug: categorySlug ?? null,
    skillSlug: skillSlug ?? null,
    uiLocale,
  };
});

export default component$(() => {
  const loc = useLocation();
  const loaderData = useWorkData();
  const listState = useSignal<CaseStudyListResult>(loaderData.value.list);
  const categoriesState = useSignal<PortfolioCategory[]>(loaderData.value.categories);
  const activeCategory = useSignal<string | null>(loaderData.value.categorySlug);
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);

  // Ensure listings appear on in-app navigation when SSR q-data briefly returns empty.
  useVisibleTask$(async ({ track }) => {
    const pathname = track(() => loc.url.pathname);
    const search = track(() => loc.url.search);
    const current = track(() => loaderData.value);
    listState.value = current.list;
    categoriesState.value = current.categories;
    activeCategory.value = current.categorySlug;
    if (current.list.items.length > 0 || current.categories.length > 0) {
      return;
    }
    const lang = uiLangFromUrlPathname(pathname);
    const url = new URL(`http://local${pathname}${search}`);
    const categorySlug = url.searchParams.get('category_slug')?.trim() || undefined;
    const skillSlug = url.searchParams.get('skill_slug')?.trim() || undefined;
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const fetchContext = {
      forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
    };
    const [list, categories] = await Promise.all([
      getCaseStudiesPage(lang, { categorySlug, skillSlug, page, perPage: PER_PAGE }, fetchContext),
      getPortfolioCategories(lang, fetchContext),
    ]);
    listState.value = list;
    categoriesState.value = categories;
    activeCategory.value = categorySlug ?? null;
  });

  const meta = listState.value.meta;
  const items = listState.value.items;
  const skillSlug = loaderData.value.skillSlug;
  const t = (key: string, params?: Record<string, string | number>) =>
    translateApp(uiLocale, key, params);

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="max-w-3xl">
              <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                {t('portfolioPage.eyebrow')}
              </p>
              <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                {t('portfolioPage.title')}
              </h1>
              <p class="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                {t('portfolioPage.subtitle')}
              </p>
            </div>
          </AnimatedReveal>

          <div class="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Side filters */}
            <aside class="lg:col-span-3" aria-label={t('portfolioPage.filters')}>
              <div class="sticky top-24 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/55 dark:backdrop-blur-none">
                <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('portfolioPage.filters')}
                </h2>
                <ul class="mt-4 space-y-1" role="list">
                  <li>
                    <Link
                      href={buildWorkHref(uiLocale, { skillSlug })}
                      class={[
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition',
                        !activeCategory.value
                          ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-950/50 dark:text-primary-200'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60',
                      ].join(' ')}
                      aria-current={!activeCategory.value ? 'page' : undefined}
                    >
                      <span>{t('portfolioPage.allProjects')}</span>
                      {meta.total > 0 && !activeCategory.value ? (
                        <span class="text-xs text-slate-500">{meta.total}</span>
                      ) : null}
                    </Link>
                  </li>
                  {categoriesState.value.map((cat) => {
                    const active = activeCategory.value === cat.slug;
                    return (
                      <li key={cat.id}>
                        <Link
                          href={buildWorkHref(uiLocale, {
                            categorySlug: cat.slug,
                            skillSlug,
                          })}
                          class={[
                            'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition',
                            active
                              ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-950/50 dark:text-primary-200'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60',
                          ].join(' ')}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span class="truncate">{cat.name}</span>
                          <span class="shrink-0 text-xs text-slate-500">{cat.projects_count}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            {/* Project grid */}
            <div class="lg:col-span-9">
              {meta.total > 0 ? (
                <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
                  {t('portfolioPage.showing', {
                    from: meta.from ?? 0,
                    to: meta.to ?? 0,
                    total: meta.total,
                  })}
                </p>
              ) : null}

              {items.length === 0 ? (
                <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900/40">
                  <p class="text-slate-600 dark:text-slate-400">{t('portfolioPage.empty')}</p>
                  {activeCategory.value ? (
                    <Link
                      href={buildWorkHref(uiLocale, { skillSlug })}
                      class="mt-4 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {t('portfolioPage.allProjects')}
                    </Link>
                  ) : null}
                </div>
              ) : (
                <ul class="grid gap-8 sm:grid-cols-2 xl:grid-cols-3" role="list">
                  {items.map((cs: CaseStudy, i: number) => (
                    <li key={cs.id}>
                      <AnimatedReveal delay={i * 40}>
                        <CaseStudyCard caseStudy={cs} />
                      </AnimatedReveal>
                    </li>
                  ))}
                </ul>
              )}

              {meta.last_page > 1 ? (
                <nav
                  class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row dark:border-slate-700"
                  aria-label={t('portfolioPage.page', {
                    current: meta.current_page,
                    last: meta.last_page,
                  })}
                >
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    {t('portfolioPage.page', {
                      current: meta.current_page,
                      last: meta.last_page,
                    })}
                  </p>
                  <div class="flex items-center gap-3">
                    {meta.current_page > 1 ? (
                      <Link
                        href={buildWorkHref(uiLocale, {
                          categorySlug: activeCategory.value,
                          skillSlug,
                          page: meta.current_page - 1,
                        })}
                        class="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {t('portfolioPage.previous')}
                      </Link>
                    ) : (
                      <span class="inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-600">
                        {t('portfolioPage.previous')}
                      </span>
                    )}
                    {meta.current_page < meta.last_page ? (
                      <Link
                        href={buildWorkHref(uiLocale, {
                          categorySlug: activeCategory.value,
                          skillSlug,
                          page: meta.current_page + 1,
                        })}
                        class="inline-flex items-center rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 transition hover:bg-primary-100 dark:border-primary-500/40 dark:bg-primary-950/40 dark:text-primary-200 dark:hover:bg-primary-950/70"
                      >
                        {t('portfolioPage.next')}
                      </Link>
                    ) : (
                      <span class="inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-600">
                        {t('portfolioPage.next')}
                      </span>
                    )}
                  </div>
                </nav>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: t('portfolioPage.homeCrumb'),
              item: getPublicSiteBaseUrl(),
            },
            { '@type': 'ListItem', position: 2, name: t('portfolioPage.title') },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const lang = uiLangFromUrlPathname(url.pathname);
  return publicListPageHead({
    page: translateApp(lang, 'portfolioPage.title'),
    description: translateApp(lang, 'portfolioPage.subtitle'),
    resolveValue,
    usePublicShell,
    url,
  });
};
