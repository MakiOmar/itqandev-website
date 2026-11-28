import { component$, useComputed$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { publicSiteName } from '~/lib/marketing/public-page-head';
import { usePublicShell } from '../../layout';
import { buildCanonicalHref, getPublicSiteBaseUrl } from '~/lib/seo/canonical-url';
import { jsonLdScript } from '~/lib/seo/json-ld';
import { seoSectionLabel } from '~/lib/seo/section-labels';
import { marketingEntityDetailHead } from '~/lib/marketing/marketing-entity-document-head';
import { getBlogPostBySlug } from '~/lib/marketing/content-layer';
import { marketingApiPageOriginMismatch } from '~/lib/marketing/api-client';
import type { BlogPost } from '~/lib/marketing/types';
import { marketingRoutes } from '~/lib/marketing/constants';
import { uiLangFromUrlPathname, uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { AnimatedReveal } from '~/components/marketing/AnimatedReveal';
import { ContentImage } from '~/components/marketing/ContentImage';
import { MarketingImageLightbox } from '~/components/marketing/MarketingImageLightbox';
import { ThemeBodyOrFallback } from '~/components/marketing/theme/ThemeBodyOrFallback';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { entityEditTarget, useAdminEditTarget } from '~/lib/marketing/admin-edit-target';
import { mergeThemeBodyWithContent } from '~/lib/marketing/theme-body-content';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';

/** SSR cannot forward cross-origin Laravel cookies; loaders return this marker for a client retry. */
type DeferredCrossOriginPayload = {
  _deferredCrossOrigin: true;
  slug: string;
  uiLocale?: string;
};

function isBlogPostValue(v: unknown): v is BlogPost {
  return (
    v != null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    typeof (v as BlogPost).slug === 'string' &&
    (v as BlogPost).slug.length > 0 &&
    typeof (v as BlogPost).title === 'string'
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

export const useBlogPost = routeLoader$(async ({ params, fail, request }) => {
  const slug = params.slug;
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const forwardAuthorization = request.headers.get('authorization') || '';
  const post = await getBlogPostBySlug(slug, uiLocale, {
    forwardCookies: cookie || undefined,
    forwardAuthorization: forwardAuthorization.trim() !== '' ? forwardAuthorization : undefined,
    forwardDocumentUrl: request.url,
  });
  if (post) {
    return post;
  }

  if (marketingApiPageOriginMismatch(request.url)) {
    return { _deferredCrossOrigin: true, slug, uiLocale } satisfies DeferredCrossOriginPayload;
  }

  return fail(404, { message: 'Blog post not found' });
});

export default component$(() => {
  const loc = useLocation();
  const MR = marketingRoutes(uiLangFromUrlPathname(loc.url.pathname));
  const postLoader = useBlogPost();
  const clientPost = useSignal<BlogPost | null>(null);
  const clientRetryPhase = useSignal<'idle' | 'pending' | 'loaded' | 'missing'>('idle');

  useVisibleTask$(async ({ track }) => {
    track(() => postLoader.value);

    clientPost.value = null;
    const raw = postLoader.value as unknown;

    if (!isDeferredCrossOriginPayload(raw)) {
      clientRetryPhase.value = 'idle';
      return;
    }

    clientRetryPhase.value = 'pending';
    try {
      const loaded = await getBlogPostBySlug(raw.slug, raw.uiLocale, undefined);
      if (loaded) {
        clientPost.value = loaded;
        clientRetryPhase.value = 'loaded';
        return;
      }
    } catch {
      /* swallow */
    }
    clientRetryPhase.value = 'missing';
  });

  const view = useComputed$(() => {
    const raw = postLoader.value as unknown;

    if (raw != null && typeof raw === 'object' && (raw as { failed?: boolean }).failed === true) {
      return { kind: 'failed' as const };
    }

    if (!isDeferredCrossOriginPayload(raw)) {
      if (isBlogPostValue(raw)) {
        return { kind: 'ok' as const, post: raw };
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

    const loaded = clientPost.value;
    if (loaded && isBlogPostValue(loaded)) {
      return { kind: 'ok' as const, post: loaded };
    }
    return { kind: 'loading' as const };
  });

  useAdminEditTarget(
    useComputed$(() => (view.value.kind === 'ok' ? entityEditTarget('blog', view.value.post) : null)),
  );

  const state = view.value;
  const shell = usePublicShell();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);

  if (state.kind === 'failed' || state.kind === 'empty') {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <Section>
        <Container size="narrow">
          <p class="rounded-md bg-slate-100 px-4 py-6 text-center text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Loading post…
          </p>
        </Container>
      </Section>
    );
  }

  if (state.kind === 'missing') {
    return (
      <Section>
        <Container size="narrow" class="text-center">
          <p class="text-lg text-slate-700 dark:text-slate-200">Blog post not found.</p>
          <Link href={MR.blog} class="mt-4 inline-block text-primary-600 underline dark:text-primary-400">
            Back to blog
          </Link>
        </Container>
      </Section>
    );
  }

  const post = state.post;
  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString(uiLocale || undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const postSections = Array.isArray(post.sections) ? (post.sections as PageSectionNode[]) : [];
  const hasBuilderSections = postSections.length > 0;
  const articleUrl = buildCanonicalHref(MR.blogSlug(post.slug));
  const orgName = publicSiteName(shell.value.branding);
  const articleImage = post.coverImage?.trim() || post.seoMeta?.ogImage?.trim() || '';

  const jsonLdBlocks = (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          inLanguage: uiLocale,
          url: articleUrl,
          mainEntityOfPage: articleUrl,
          image: articleImage || undefined,
          author: post.author ? { '@type': 'Person', name: post.author.name } : undefined,
          publisher: {
            '@type': 'Organization',
            name: orgName,
            url: getPublicSiteBaseUrl(),
          },
        })}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: seoSectionLabel(uiLocale, 'home'),
              item: buildCanonicalHref(MR.home),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: seoSectionLabel(uiLocale, 'blog'),
              item: buildCanonicalHref(MR.blog),
            },
            { '@type': 'ListItem', position: 3, name: post.title, item: articleUrl },
          ],
        })}
      />
      {post.seoMeta?.schema != null ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(post.seoMeta.schema)} />
      ) : null}
    </>
  );

  if (hasBuilderSections) {
    const sections = mergeThemeBodyWithContent(shell.value.themeBody, postSections);
    return (
      <>
        <HomepageSectionsRenderer
          sections={sections}
          uiLocale={uiLocale}
          branding={shell.value.branding}
          services={shell.value.siteContent?.services ?? []}
          caseStudies={[]}
          testimonials={[]}
          blogPosts={[]}
          techStack={shell.value.siteContent?.techStack ?? []}
          siteContact={shell.value.siteContent?.contact}
          layoutAware={true}
          allowDefaultSections={false}
          pageContext={{ title: post.title ?? '', slug: String(post.slug || '') }}
        />
        {jsonLdBlocks}
      </>
    );
  }

  return (
    <ThemeBodyOrFallback
      themeBody={shell.value.themeBody}
      renderer={{
        uiLocale,
        branding: shell.value.branding,
        services: shell.value.siteContent?.services ?? [],
        caseStudies: [],
        testimonials: [],
        blogPosts: [],
        techStack: shell.value.siteContent?.techStack ?? [],
        siteContact: shell.value.siteContent?.contact,
        pageContext: { title: post.title ?? '', slug: String(post.slug || '') },
      }}
    >
      <>
        <section class="relative overflow-hidden bg-slate-950 text-slate-100">
          <div
            class="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[color:var(--kit-color-accent)]/20 blur-3xl"
            aria-hidden="true"
          />
          <Container size="narrow">
            <div class="relative py-12 sm:py-16">
              <AnimatedReveal>
                <Link
                  href={MR.blog}
                  class="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white"
                >
                  <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to blog
                </Link>
              </AnimatedReveal>
              <AnimatedReveal delay={60}>
                <header class="mt-8">
                  {dateStr ? (
                    <time dateTime={post.date} class="text-sm text-slate-400">
                      {dateStr}
                    </time>
                  ) : null}
                  <h1 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {post.title}
                  </h1>
                  {post.excerpt ? (
                    <p class="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                      {post.excerpt}
                    </p>
                  ) : null}
                  {post.author?.name ? (
                    <p class="mt-3 text-sm text-slate-400">By {post.author.name}</p>
                  ) : null}
                </header>
              </AnimatedReveal>
            </div>
          </Container>
        </section>

        <Section>
          <Container size="narrow">
            <article class="-mt-6 rounded-2xl bg-[#FDF8EE] px-5 py-8 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-700/60 sm:px-8 sm:py-10">
              <AnimatedReveal delay={80}>
                <MarketingImageLightbox>
                  {post.coverImage !== undefined && (
                    <div class="mb-8 aspect-video w-full overflow-hidden rounded-xl bg-slate-100 shadow-lg ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-600/50">
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
                    class="article-content prose prose-slate mt-0 max-w-none dark:prose-invert [&_img]:rounded-xl [&_img]:shadow-sm"
                    dangerouslySetInnerHTML={post.body}
                  />
                </MarketingImageLightbox>
              </AnimatedReveal>
            </article>
          </Container>
        </Section>

        {jsonLdBlocks}
      </>
    </ThemeBodyOrFallback>
  );
});

export const head: DocumentHead = ({ resolveValue, url }) => {
  const shell = resolveValue(usePublicShell);
  const brandName = publicSiteName(shell.branding);
  try {
    const raw = resolveValue(useBlogPost) as unknown;
    if (!isBlogPostValue(raw)) {
      return {
        title: `404 | ${brandName}`,
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
      };
    }
    const post = raw;
    const result = marketingEntityDetailHead({
      brandName,
      baseUrl: getPublicSiteBaseUrl(url.origin).replace(/\/$/, ''),
      // Omit `{section}` so titles stay under ~60 chars (headline + brand only).
      sectionLabel: '',
      pageUrl: url,
      defaultTitle: post.title ?? '',
      defaultDescription: post.excerpt || '',
      defaultImage: post.coverImage,
      seo: post.seoMeta,
      seoDefaults: shell.branding?.seo_defaults,
      typeKey: 'blog_post',
      siteDescription: shell.branding?.site_description,
    });
    return {
      ...result,
      meta: [...result.meta, { property: 'og:type', content: 'article' }],
    };
  } catch {
    return {
      title: `404 | ${brandName}`,
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  }
};
