import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { PageBuilderWorkspace } from '../../../../../../components/admin/pages/PageBuilderWorkspace';
import { useTranslate, translateApp } from '../../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../../layout';
import { runBlogPostUpdateFromBrowser } from '../../../../../../lib/admin/blog-actions';
import { adminApiClient } from '../../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../../lib/api/endpoints';
import { adminBlogEditHref, useAppRoutes } from '../../../../../../lib/constants/routes';
import {
  EMPTY_DYNAMIC_TAG_CATALOG,
  fetchAppearanceRegistriesFromBrowser,
  type DynamicTagCatalog,
} from '../../../../../../lib/admin/appearance-actions';
import {
  dynamicTagCatalogForBlogPost,
  dynamicTagCatalogFromRegistries,
} from '../../../../../../lib/admin/builder-dynamic-tags';
import { getPageBuilderMarketingSupport } from '../../../../../../lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '../../../../../../lib/i18n/ui-locale-path';
import type { AppearanceRegistryEntry, PageSectionNode } from '../../../../../../lib/marketing/appearance-types';
import type { BlogPost } from '../../../../../../types/blog';
import { primaryLocaleForContent } from '../../../../../../lib/content-display-locale';
import { BUILDER_LOCALE_PARAM, resolveBuilderInitialLocale } from '../../../../../../lib/admin/builder-locale';

type BlogBuilderPost = Pick<
  BlogPost,
  'id' | 'title' | 'slug' | 'excerpt' | 'status' | 'content_locale' | 'translations'
> & {
  sections: PageSectionNode[];
};

function mapBlogPostFromApi(raw: Record<string, unknown>): BlogBuilderPost {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: (String(raw.status ?? 'draft') as BlogPost['status']),
    content_locale: (raw.content_locale as string | null) ?? null,
    sections: Array.isArray(raw.sections) ? (raw.sections as PageSectionNode[]) : [],
    translations: Array.isArray(raw.translations)
      ? (raw.translations as BlogPost['translations'])
      : [],
  };
}

export const useBlogPostBuilderData = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.BLOG.GET(id));
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return mapBlogPostFromApi(body);
  } catch {
    return fail(404, { message: 'Blog post not found' });
  }
});

export const useBlogPostBuilderPreviewSupport = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  const fetchContext = { forwardDocumentUrl: request.url };
  return getPageBuilderMarketingSupport(uiLocale, fetchContext);
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const postLoader = useBlogPostBuilderData();
  const previewSupport = useBlogPostBuilderPreviewSupport();
  const post = postLoader.value as BlogBuilderPost;

  const sections = useSignal<PageSectionNode[]>(post.sections || []);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const dynamicTags = useSignal<DynamicTagCatalog>(EMPTY_DYNAMIC_TAG_CATALOG);
  const loc = useLocation();
  const activeLocale = useSignal(
    resolveBuilderInitialLocale(langConfig.value, loc.url.searchParams.get(BUILDER_LOCALE_PARAM)),
  );
  const saving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? regs.homepage_sections ?? [])];
      dynamicTags.value = dynamicTagCatalogForBlogPost(dynamicTagCatalogFromRegistries(regs));
    } catch {
      registry.value = [];
    }
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        post.content_locale,
      );
      const result = await runBlogPostUpdateFromBrowser(post.id, {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        status: post.status === 'published' ? 'published' : post.status === 'archived' ? 'archived' : 'draft',
        content_locale: post.content_locale || '',
        editing_locale: effectivePrimary,
        effective_primary_locale: effectivePrimary,
        canonical_title: post.title,
        canonical_excerpt: post.excerpt || '',
        persist_sections: true,
        sections_json: JSON.stringify(sections.value),
        translations_json: JSON.stringify(post.translations || []),
      });
      if (result.success) {
        await success(translateApp(lang, 'common.updated'));
        return true;
      }
      await showError(result.error || translateApp(lang, 'common.error'));
      return false;
    } finally {
      saving.value = false;
    }
  });

  return (
    <PageBuilderWorkspace
      lang={lang}
      pageTitle={post.title}
      classicEditHref={adminBlogEditHref(lang, post.id)}
      breadcrumbs={[
        { label: translateApp(lang, 'blog.title'), href: R.ADMIN.BLOG },
        { label: post.title || `#${post.id}`, href: adminBlogEditHref(lang, post.id) },
        { label: translateApp(lang, 'blog.builderTitle') },
      ]}
      sections={sections}
      registry={registry}
      siteLanguages={langConfig.value.site_languages || []}
      defaultLocale={langConfig.value.default_locale || 'en'}
      activeLocale={activeLocale}
      onSave$={handleSave$}
      saving={saving}
      previewSupport={previewSupport.value}
      dynamicTags={dynamicTags.value}
      exportBuilderKind="blog_post"
      titleI18nKey="blog.builderTitle"
      hintI18nKey="blog.builderHint"
    />
  );
});

export const head: DocumentHead = {
  title: 'Blog Post Builder - Dashboard',
  meta: [
    { name: 'description', content: 'Fullscreen blog post layout builder' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
};
