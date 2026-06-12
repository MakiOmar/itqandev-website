import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { buildCanonicalHref, getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { publicPageTitle } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../layout';
import { getBlogPosts } from '~/lib/marketing/content-layer';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { BlogCard } from '~/components/marketing/BlogCard';
import type { BlogPost } from '~/lib/marketing/types';

export const useBlogData = routeLoader$(async () => getBlogPosts());

export default component$(() => {
  const posts = useBlogData().value;

  return (
    <>
      <Section>
        <Container>
          <AnimatedReveal>
            <div class="mx-auto max-w-2xl text-center">
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Blog
              </h1>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Updates, tips, and insights from our team.
              </p>
            </div>
          </AnimatedReveal>

          <ul class="mx-auto mt-16 grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {posts.map((post: BlogPost, i: number) => (
              <li key={post.slug}>
                <AnimatedReveal delay={i * 60}>
                  <BlogCard post={post} />
                </AnimatedReveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: getPublicSiteBaseUrl() },
            { '@type': 'ListItem', position: 2, name: 'Blog' },
          ],
        })}
      />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const shell = resolveValue(usePublicShell);
  const pageTitle = publicPageTitle('Blog', shell.branding);
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  return {
    title: pageTitle,
    meta: [
      { name: 'description', content: 'Blog posts and updates from our development team.' },
      { property: 'og:title', content: pageTitle },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  };
};
