import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { usePublicShell } from '../../layout';
import { Container } from '~/components/marketing/Container';
import { Section } from '~/components/marketing/Section';
import { ThemeBodyOrFallback } from '~/components/marketing/theme/ThemeBodyOrFallback';
import { uiLangFromUrlPathname } from '~/lib/i18n/ui-locale-path';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { marketingGet } from '~/lib/marketing/api-client';
import { publicSiteName } from '~/lib/marketing/public-page-head';
import { buildCanonicalHref } from '~/lib/seo/canonical-url';
import { jsonLdScript } from '~/lib/seo/json-ld';
import { applyTitleTemplate, resolveSeoDefaults } from '~/lib/seo/seo-defaults';

type PublicContentSingle = {
  type: string;
  id: number;
  title: string;
  excerpt: string;
  image: string;
  path: string;
  /** From the content type's optional `seo()` hook; null fields fall back to the post fields. */
  seo?: { title: string | null; description: string | null; image: string | null; json_ld: unknown };
};

/**
 * Singles of registry content types without a dedicated folder (addon types), e.g. `/en/products/blue-mug/`.
 * Static siblings (`blog`, `services`, `portfolio`, `forms`, `pages`, `admin`) are more specific and win.
 * The body is the Theme Builder single the shell resolves for this path; there is no hardcoded template.
 */
export const useContentSingle = routeLoader$(async ({ params, url, fail }) => {
  const prefix = String(params.contentPrefix ?? '').toLowerCase();
  if (prefix === 'admin') {
    return fail(404, { message: 'Not found' });
  }
  try {
    const single = await marketingGet<PublicContentSingle>(
      MARKETING_ENDPOINTS.contentSingle(prefix, String(params.slug ?? '')),
      uiLangFromUrlPathname(url.pathname),
    );
    if (!single || typeof single.title !== 'string') {
      return fail(404, { message: 'Not found' });
    }
    return single;
  } catch {
    return fail(404, { message: 'Not found' });
  }
});

export default component$(() => {
  const loc = useLocation();
  const shell = usePublicShell();
  const loaded = useContentSingle();
  const uiLocale = uiLangFromUrlPathname(loc.url.pathname);
  const single = 'failed' in loaded.value ? null : loaded.value;

  if (!single) {
    return (
      <Section>
        <Container size="narrow">
          {/* Unknown prefix or unpublished record */}
          <h1 class="text-center text-6xl font-bold text-slate-900 dark:text-white">404</h1>
        </Container>
      </Section>
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
        pageContext: { title: single.title, slug: String(loc.params.slug ?? '') },
      }}
    >
      {/* No Theme Builder single assigned yet: show the title so the URL is not blank */}
      <Section>
        <Container size="narrow">
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">{single.title}</h1>
          {single.excerpt ? <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">{single.excerpt}</p> : null}
        </Container>
      </Section>
    </ThemeBodyOrFallback>
  );
});

/** og:image must be absolute; media URLs may be site-relative. */
function absoluteUrl(value: string, origin: string): string {
  if (!value) return '';
  try {
    return new URL(value, origin).href;
  } catch {
    return '';
  }
}

export const head: DocumentHead = ({ resolveValue, url }) => {
  const branding = resolveValue(usePublicShell).branding;
  const brandName = publicSiteName(branding);
  const loaded = resolveValue(useContentSingle);
  if (!loaded || 'failed' in loaded) {
    return {
      title: `404 | ${brandName}`,
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  }
  // Addon content types have no type-level defaults; the global SEO defaults fill the gaps.
  const defaults = resolveSeoDefaults(branding?.seo_defaults, null);
  const canonical = buildCanonicalHref(url.pathname, url.origin);
  const title = loaded.seo?.title || loaded.title;
  const description =
    loaded.seo?.description || loaded.excerpt || defaults.description || branding?.site_description || '';
  const rawImage = loaded.seo?.image || loaded.image || defaults.ogImage;
  const image = absoluteUrl(rawImage, url.origin);
  return {
    title: applyTitleTemplate(defaults.titleTemplate, { title, section: '', site: brandName }),
    meta: [
      ...(description ? [{ name: 'description', content: description }] : []),
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      ...(image ? [{ property: 'og:image', content: image }] : []),
      { name: 'twitter:card', content: defaults.twitterCard || (image ? 'summary_large_image' : 'summary') },
    ],
    links: [{ rel: 'canonical', href: canonical }],
    scripts: loaded.seo?.json_ld
      ? [{ key: 'content-json-ld', script: jsonLdScript(loaded.seo.json_ld), props: { type: 'application/ld+json' } }]
      : [],
  };
};
