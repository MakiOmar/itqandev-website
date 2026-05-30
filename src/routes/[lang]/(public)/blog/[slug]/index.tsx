import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { getConfig } from '~/lib/config';
import { getBlogPostBySlug } from '~/lib/marketing/content-layer';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { ContentImage } from '~/components/marketing/ContentImage';
import { MarketingImageLightbox } from '~/components/marketing/MarketingImageLightbox';

export const useBlogPost = routeLoader$(async ({ params, fail }) => {
  const slug = params.slug;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return fail(404, { message: 'Blog post not found' });
  }
  return post;
});

export default component$(() => {
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const post = useBlogPost().value;
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || '';
  const dateStr = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <>
      <Section>
        <Container size="narrow">
          <AnimatedReveal>
            <Link
              href={MR.blog}
              class="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to blog
            </Link>
          </AnimatedReveal>

          <article class="mt-8">
            <AnimatedReveal delay={60}>
              <header>
                <time dateTime={post.date} class="text-sm text-slate-500 dark:text-slate-400">
                  {dateStr}
                </time>
                <h1 class="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                  {post.title}
                </h1>
                {post.author?.name && (
                  <p class="mt-2 text-slate-600 dark:text-slate-400">
                    By {post.author.name}
                  </p>
                )}
              </header>
              <MarketingImageLightbox>
                {post.coverImage !== undefined && (
                  <div class="mt-8 aspect-video w-full overflow-hidden rounded-xl bg-slate-100 shadow-lg ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-600/50">
                    <ContentImage
                      src={post.coverImage}
                      alt={post.coverImageAlt || post.title}
                      width={960}
                      height={540}
                      fetchPriority="high"
                      class="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div
                  class="article-content mt-8 max-w-none [&_img]:rounded-xl [&_img]:shadow-sm"
                  dangerouslySetInnerHTML={post.body}
                />
              </MarketingImageLightbox>
            </AnimatedReveal>
          </article>
        </Container>
      </Section>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: post.author ? { '@type': 'Person', name: post.author.name } : undefined,
        })}
      />

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: baseUrl + '/blog' },
            { '@type': 'ListItem', position: 3, name: post.title },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const config = getConfig();
  const baseUrl = (import.meta.env?.VITE_SITE_URL as string) || 'https://example.com';
  try {
    const post = resolveValue(useBlogPost);
    const title = post.seoMeta?.title || post.title;
    const description = post.seoMeta?.description || post.excerpt;
    return {
      title: `${title} | Blog | ${config.branding.name}`,
      meta: [
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: `${baseUrl}/blog/${post.slug}` },
      ],
      links: [{ rel: 'canonical', href: `${baseUrl}/blog/${post.slug}` }],
    };
  } catch {
    return {
      title: `404 | ${config.branding.name}`,
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  }
};
