import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';
import {
  getBlogPostsPage,
  type BlogPostListResult,
} from '~/lib/marketing/content-layer';
import { uiLangFromUrlPathname, withUiLocale } from '~/lib/i18n/ui-locale-path';
import { translateApp } from '~/lib/i18n/useTranslate';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { BlogCard } from '~/components/marketing/BlogCard';
import type { BlogPost } from '~/lib/marketing/types';

export const ARTICLES_PER_PAGE = 12;

export function buildArticlesHref(
  uiLocale: string,
  opts: { page?: number },
): string {
  const base = withUiLocale(uiLocale, '/blog/');
  const q = new URLSearchParams();
  if (opts.page && opts.page > 1) {
    q.set('page', String(opts.page));
  }
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export type BlogPostsListProps = {
  uiLocale: string;
  /** SSR / route-loader payload */
  initialList: BlogPostListResult;
  /** Kit setting: posts per page (default 12). */
  perPage?: number;
  class?: string;
};

/**
 * Live blog grid with pagination.
 * Used by the `blog_posts_list` page-builder kit and the legacy /blog fallback.
 */
export const BlogPostsList = component$<BlogPostsListProps>((props) => {
  const loc = useLocation();
  const listState = useSignal<BlogPostListResult>(props.initialList);
  const perPage = Math.min(48, Math.max(1, Number(props.perPage) || ARTICLES_PER_PAGE));
  const uiLocale = props.uiLocale || uiLangFromUrlPathname(loc.url.pathname);

  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    track(() => loc.url.search);
    track(() => props.initialList);
    track(() => props.perPage);

    listState.value = props.initialList;

    if (props.initialList.items.length > 0 || props.initialList.meta.total > 0) {
      return;
    }

    const lang = uiLangFromUrlPathname(loc.url.pathname);
    const page = Math.max(1, Number(loc.url.searchParams.get('page')) || 1);
    const fetchContext = {
      forwardDocumentUrl: typeof window !== 'undefined' ? window.location.href : null,
    };
    listState.value = await getBlogPostsPage(lang, { page, perPage }, fetchContext);
  });

  const meta = listState.value.meta;
  const items = listState.value.items;
  const t = (key: string, params?: Record<string, string | number>) =>
    translateApp(uiLocale, key, params);

  return (
    <div class={['w-full', props.class].filter(Boolean).join(' ')}>
      {meta.total > 0 ? (
        <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {t('articlesPage.showing', {
            from: meta.from ?? 0,
            to: meta.to ?? 0,
            total: meta.total,
          })}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900/40">
          <p class="text-slate-600 dark:text-slate-300">{t('articlesPage.empty')}</p>
        </div>
      ) : (
        <ul class="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {items.map((post: BlogPost, i: number) => (
            <li key={post.slug}>
              <AnimatedReveal delay={i * 60}>
                <BlogCard post={post} />
              </AnimatedReveal>
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 ? (
        <nav
          class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-700"
          aria-label={t('articlesPage.page', {
            current: meta.current_page,
            last: meta.last_page,
          })}
        >
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {t('articlesPage.page', {
              current: meta.current_page,
              last: meta.last_page,
            })}
          </p>
          <div class="flex items-center gap-2">
            {meta.current_page > 1 ? (
              <Link
                href={buildArticlesHref(uiLocale, { page: meta.current_page - 1 })}
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('articlesPage.previous')}
              </Link>
            ) : null}
            {meta.current_page < meta.last_page ? (
              <Link
                href={buildArticlesHref(uiLocale, { page: meta.current_page + 1 })}
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('articlesPage.next')}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
});
