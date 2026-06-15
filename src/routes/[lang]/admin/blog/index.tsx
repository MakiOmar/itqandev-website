import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, useLocation, zod$, z } from '@builder.io/qwik-city';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../lib/api/client';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import type { BlogPost } from '../../../../types/blog';
import type { ContentSeoMetaRow } from '../../../../types/content-seo';
import { usePublicSiteMeta } from '../layout';
import { normalizeEditingLocale, primaryLocaleForContent } from '../../../../lib/content-display-locale';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';
import { uiLangFromUrlPathname } from '../../../../lib/i18n/ui-locale-path';
import { useContentSlugAutosuggestForm } from '../../../../lib/slug/content-slug-auto';
import { AdminPublicPageLink } from '../../../../components/admin/AdminPublicPageLink';
import { AdminContentImportExportButtons } from '../../../../components/admin/AdminContentImportExportButtons';

function blogSeoRowHasData(row: ContentSeoMetaRow | Record<string, unknown>): boolean {
  const nonempty = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  return (
    nonempty(row.meta_title) ||
    nonempty(row.meta_description) ||
    nonempty(row.canonical_url) ||
    nonempty(row.og_title) ||
    nonempty(row.og_description) ||
    nonempty(row.og_image) ||
    nonempty(row.twitter_card) ||
    (row.schema != null &&
      row.schema !== '' &&
      !(typeof row.schema === 'object' &&
        row.schema !== null &&
        !Array.isArray(row.schema) &&
        Object.keys(row.schema).length === 0) &&
      !(Array.isArray(row.schema) && row.schema.length === 0))
  );
}

/** Count locales with any non-empty SEO morph field (for list badge). */
function countBlogLocalesWithSeoData(post: BlogPost): number {
  const raw = post.seoMetas ?? ((post as unknown as { seo_metas?: unknown[] }).seo_metas ?? []);
  if (!Array.isArray(raw)) return 0;
  return raw.filter((r) => r && typeof r === 'object' && blogSeoRowHasData(r as ContentSeoMetaRow)).length;
}

/**
 * Load blog posts
 */
export const useBlogPosts = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get<BlogPost[]>(API_ENDPOINTS.BLOG.LIST);
    
    // Handle paginated response
    if (response && 'data' in response && response.data) {
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data as BlogPost[];
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data as BlogPost[];
      }
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to load blog posts:', error);
    return [];
  }
});

/**
 * Save blog post action (create/update)
 */
export const useSaveBlogPost = routeAction$(
  async (data) => {
    try {
      const apiClient = getApiClient();
      const payload: any = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || '',
        content: data.content,
        status: data.status || 'draft',
        featured: data.featured === 'true' || data.featured === true,
        published_at: data.published_at || null,
      };

      if (data.id) {
        await apiClient.put(API_ENDPOINTS.BLOG.UPDATE(data.id), payload);
      } else {
        await apiClient.post(API_ENDPOINTS.BLOG.CREATE, payload);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save blog post',
      };
    }
  },
  zod$({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Title is required'),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().min(1, 'Content is required'),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    featured: z.union([z.boolean(), z.string()]).optional(),
    published_at: z.string().optional(),
  }),
);

/**
 * Upload featured image action
 */
export const useUploadFeaturedImage = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    const formData = new FormData();
    if (data.file instanceof File) {
      formData.append('file', data.file);
    }
    await apiClient.post(`/v1/media/blog-post/${data.postId}/featured_image`, formData);
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to upload featured image' });
  }
}, zod$({ postId: z.string(), file: z.any() }));

/**
 * Save SEO action
 */
export const useSaveSeo = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.put(`/v1/seo/blog-post/${data.postId}`, {
      locale: String(data.locale || '').trim().toLowerCase(),
      meta_title: data.meta_title || '',
      meta_description: data.meta_description || '',
    });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to save SEO' });
  }
}, zod$({
  postId: z.string(),
  locale: z.string().min(1).max(16),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
}));

/**
 * Delete blog post action
 */
export const useDeleteBlogPost = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.delete(API_ENDPOINTS.BLOG.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete blog post' });
  }
}, zod$({ id: z.string() }));

/**
 * Blog list page - Matching Vue Dashboard
 */
export default component$(() => {
  const { lang } = useTranslate();
  const location = useLocation();
  const { confirm, success, error: showError } = useSwal();
  const postsLoader = useBlogPosts();
  const langConfig = usePublicSiteMeta();
  const saveAction = useSaveBlogPost();
  const uploadImageAction = useUploadFeaturedImage();
  const saveSeoAction = useSaveSeo();
  const deleteAction = useDeleteBlogPost();

  // Pre-compute commonly used translation strings to avoid serialization issues
  const translations = {
    success: translateApp(lang, 'common.success'),
    updated: translateApp(lang, 'common.updated'),
    created: translateApp(lang, 'common.created'),
    deleted: translateApp(lang, 'common.deleted'),
    deleteConfirm: translateApp(lang, 'blog.deleteConfirm'),
  };

  const { items: posts, loading, refetch } = useLocaleAwareList<BlogPost>(
    postsLoader,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get<any>(API_ENDPOINTS.BLOG.LIST).then((response) => {
        if (response && 'data' in response && (response as any).data) {
          const data = (response as any).data;
          if (Array.isArray(data)) {
            return data as BlogPost[];
          }
          if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
            return (data as any).data as BlogPost[];
          }
        }
        return [];
      });
    }),
  );
  const showForm = useSignal(false);
  const editingPostId = useSignal<number | null>(null);
  const featuredImageFile = useSignal<File | null>(null);
  const selectedPostId = useSignal<number | null>(null);
  const exportImportBusy = useSignal(false);
  const blogSelectionForExport = useSignal<string[]>([]);
  
  const formPost = useSignal({
    id: null as number | null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    featured: false,
    published_at: '',
  });

  const blogPostIdForSlugIgnore = useComputed$(() =>
    formPost.value.id != null ? Number(formPost.value.id) : undefined,
  );

  const blogSlugForm = useContentSlugAutosuggestForm('blog_posts', formPost, 'title', blogPostIdForSlugIgnore);

  const refetchList = $((locale: string) => refetch(locale));

  const formSeo = useSignal({
    meta_title: '',
    meta_description: '',
  });

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (post: BlogPost): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      (post as any).content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (post: BlogPost): string => {
    const rows = (post as any).translations as Array<{ locale?: string | null }> | undefined;
    const locales = Array.isArray(rows)
      ? Array.from(
          new Set(
            rows
              .map((r) => String(r?.locale ?? '').trim().toLowerCase())
              .filter((x) => x.length > 0),
          ),
        )
      : [];
    if (locales.length === 0) {
      return translateApp(lang, 'contentTranslations.noSecondaryLanguages') || '—';
    }
    const labels = locales.map((code) => `${languageLabelByCode.get(code) || code} (${code})`);
    return `${locales.length}: ${labels.join(', ')}`;
  };

  const loadPosts = $(async () => {
    try {
      await refetch(uiLangFromUrlPathname(location.url.pathname));
    } catch (error: any) {
      await showError(error?.message || 'Failed to load posts');
    }
  });

  const resetForm = $(() => {
    blogSlugForm.slugLocked.value = false;
    formPost.value = {
      id: null,
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      status: 'draft',
      featured: false,
      published_at: '',
    };
    editingPostId.value = null;
    showForm.value = false;
  });

  const editPost = $((post: BlogPost) => {
    blogSlugForm.slugLocked.value = false;
    formPost.value = {
      id: post.id as number,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      status: post.status || 'draft',
      featured: post.featured || false,
      published_at: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : '',
    };
    editingPostId.value = post.id as number;
    showForm.value = true;
  });

  const savePost = $(async () => {
    const formData = new FormData();
    formData.append('title', formPost.value.title);
    formData.append('slug', formPost.value.slug);
    formData.append('excerpt', formPost.value.excerpt);
    formData.append('content', formPost.value.content);
    formData.append('status', formPost.value.status);
    formData.append('featured', String(formPost.value.featured));
    if (formPost.value.published_at) {
      formData.append('published_at', formPost.value.published_at);
    }
    if (formPost.value.id) {
      formData.append('id', String(formPost.value.id));
    }

    const response = await saveAction.submit(formData);
    if (response.value?.success) {
      const successText = formPost.value.id ? translations.updated : translations.created;
      await success(translations.success, {
        text: successText,
      });
      resetForm();
      await loadPosts();
    } else {
      await showError((response.value as any)?.error || 'Failed to save post');
    }
  });

  const deletePost = $(async (id: string | number) => {
    const result = await confirm(translations.deleteConfirm);
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(id) });
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to delete post');
    } else {
      await success(translations.success, { text: translations.deleted });
      posts.value = posts.value.filter((p) => p.id !== id);
    }
  });

  const uploadFeaturedImage = $(async (postId: number) => {
    if (!featuredImageFile.value || selectedPostId.value !== postId) return;

    const formData = new FormData();
    formData.append('file', featuredImageFile.value);
    formData.append('postId', String(postId));

    const response = await uploadImageAction.submit(formData);
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to upload image');
    } else {
      await success(translations.success, { text: 'Featured image uploaded' });
      featuredImageFile.value = null;
      selectedPostId.value = null;
      await loadPosts();
    }
  });

  const saveSeo = $(async (postId: number) => {
    if (selectedPostId.value !== postId) return;

    const locale = normalizeEditingLocale(
      langConfig.value.content_editing_locale,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      null,
    );

    const formData = new FormData();
    formData.append('postId', String(postId));
    formData.append('locale', locale);
    formData.append('meta_title', formSeo.value.meta_title);
    formData.append('meta_description', formSeo.value.meta_description);

    const response = await saveSeoAction.submit(formData);
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to save SEO');
    } else {
      await success(translations.success, { text: 'SEO saved' });
      formSeo.value = { meta_title: '', meta_description: '' };
      selectedPostId.value = null;
      await loadPosts();
    }
  });

  return (
    <>
      {/* Component: BlogPage */}
      <div>
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{translateApp(lang, 'blog.title')}</h1>
            <p class="text-gray-600 dark:text-gray-400">{translateApp(lang, 'blog.subtitle')}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AdminContentImportExportButtons
              lang={lang}
              exportEndpoint={API_ENDPOINTS.BLOG.EXPORT}
              importEndpoint={API_ENDPOINTS.BLOG.IMPORT}
              filePrefix="blog-posts"
              selectedIds={blogSelectionForExport}
              busy={exportImportBusy}
              onRefetch$={refetchList}
            />
            {!showForm.value ? (
              <button
                onClick$={() => (showForm.value = true)}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'blog.addNew')}
              </button>
            ) : (
              <button
                onClick$={resetForm}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.cancel')}
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        {showForm.value && (
          <div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold">
              {editingPostId.value ? translateApp(lang, 'blog.edit') : translateApp(lang, 'blog.addNew')}
            </h2>
            <form class="space-y-4" onSubmit$={savePost} preventdefault:submit>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'blog.name')}
                  </label>
                  <input
                    type="text"
                    value={formPost.value.title}
                    onInput$={(e: any) => (formPost.value.title = e.target.value)}
                    onBlur$={blogSlugForm.onTitleBlurSuggestSlug$}
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'blog.slug')}
                  </label>
                  <input
                    type="text"
                    value={formPost.value.slug}
                    onInput$={$((e: Event) => {
                      blogSlugForm.slugLocked.value = true;
                      formPost.value = {
                        ...formPost.value,
                        slug: (e.target as HTMLInputElement).value,
                      };
                    })}
                    onBlur$={blogSlugForm.onSlugBlurEnsureUnique$}
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  <AdminPublicPageLink lang={lang} kind="blog" slug={formPost.value.slug} />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {translateApp(lang, 'blog.excerpt')}
                </label>
                <textarea
                  rows={2}
                  value={formPost.value.excerpt}
                  onInput$={(e: any) => (formPost.value.excerpt = e.target.value)}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {translateApp(lang, 'blog.content')}
                </label>
                <textarea
                  rows={8}
                  value={formPost.value.content}
                  onInput$={(e: any) => (formPost.value.content = e.target.value)}
                  required
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'blog.status')}
                  </label>
                  <select
                    value={formPost.value.status}
                    onChange$={(e: any) => (formPost.value.status = e.target.value)}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  >
                    <option value="draft">{translateApp(lang, 'blog.statusDraft')}</option>
                    <option value="published">{translateApp(lang, 'blog.statusPublished')}</option>
                    <option value="archived">{translateApp(lang, 'blog.statusArchived')}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'blog.publishedAt')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formPost.value.published_at}
                    onInput$={(e: any) => (formPost.value.published_at = e.target.value)}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={formPost.value.featured}
                      onChange$={(e: any) => (formPost.value.featured = e.target.checked)}
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {translateApp(lang, 'blog.featured')}
                  </label>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  onClick$={savePost}
                  disabled={saveAction.isRunning}
                  class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {editingPostId.value ? translateApp(lang, 'common.update') : translateApp(lang, 'common.add')}
                </button>
                <button
                  type="button"
                  onClick$={resetForm}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {translateApp(lang, 'common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posts List */}
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 class="text-lg font-semibold">{translateApp(lang, 'blog.list')}</h2>
          </div>
          {loading.value ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <LoadingSpinner />
            </div>
          ) : posts.value.length === 0 ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">{translateApp(lang, 'blog.noPosts')}</div>
          ) : (
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              {posts.value.map((post) => {
                const seoLocaleCount = countBlogLocalesWithSeoData(post);
                return (
                <div
                  key={post.id}
                  class="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div class="flex-1">
                      <div class="flex items-start justify-between">
                        <div>
                          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{post.title}</h3>
                          <p class="text-sm text-gray-500 dark:text-gray-400">{translateApp(lang, 'blog.slug')}: {post.slug}</p>
                          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <span class="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-900/40">
                              <span class="font-semibold">{translateApp(lang, 'contentTranslations.contentPrimaryLanguage') || 'Main'}:</span>{' '}
                              {mainLocaleLabel(post)}
                            </span>
                            <span class="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-900/40">
                              <span class="font-semibold">{translateApp(lang, 'contentTranslations.sectionTitle') || 'Translations'}:</span>{' '}
                              {translationsLabel(post)}
                            </span>
                          </div>
                          {post.excerpt && (
                            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{post.excerpt}</p>
                          )}
                          <div class="mt-2 flex flex-wrap gap-2">
                            <span
                              class={`rounded-full px-2 py-1 text-xs font-medium ${
                                post.status === 'published'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : post.status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {post.status === 'published'
                                ? translateApp(lang, 'blog.statusPublished')
                                : post.status === 'draft'
                                  ? translateApp(lang, 'blog.statusDraft')
                                  : translateApp(lang, 'blog.statusArchived')}
                            </span>
                            {post.featured && (
                              <span class="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                                {translateApp(lang, 'blog.featured')}
                              </span>
                            )}
                            <span
                              class={
                                seoLocaleCount > 0
                                  ? 'rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                  : 'rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }
                              title={translateApp(lang, 'blog.seoLocalesHint')}
                            >
                              {seoLocaleCount > 0
                                ? translateApp(lang, 'blog.seoLocalesCount', {
                                    count: String(seoLocaleCount),
                                  })
                                : translateApp(lang, 'blog.seoLocalesNone')}
                            </span>
                            {post.author && (
                              <span class="text-xs text-gray-500 dark:text-gray-400">
                                {translateApp(lang, 'blog.author', { name: (post.author as any)?.name || 'Unknown' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col gap-2 md:w-64">
                      <div class="flex gap-2">
                        <button
                          onClick$={() => editPost(post)}
                          class="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                        >
                          {translateApp(lang, 'common.edit')}
                        </button>
                        <button
                          onClick$={() => deletePost(post.id)}
                          class="flex-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {translateApp(lang, 'common.delete')}
                        </button>
                      </div>
                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {translateApp(lang, 'blog.featuredImage')}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange$={(e: any) => {
                            featuredImageFile.value = e.target.files?.[0] || null;
                            selectedPostId.value = post.id as number;
                          }}
                          class="text-xs"
                        />
                        <button
                          onClick$={() => uploadFeaturedImage(post.id as number)}
                          disabled={!featuredImageFile.value || selectedPostId.value !== post.id}
                          class="w-full rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
                        >
                          {translateApp(lang, 'blog.uploadImage')}
                        </button>
                      </div>
                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {translateApp(lang, 'seo.title')}
                        </label>
                        <input
                          type="text"
                          value={formSeo.value.meta_title}
                          onInput$={(e: any) => {
                            formSeo.value.meta_title = e.target.value;
                            selectedPostId.value = post.id as number;
                          }}
                          placeholder={translateApp(lang, 'seo.metaTitle')}
                          class="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                        />
                        <input
                          type="text"
                          value={formSeo.value.meta_description}
                          onInput$={(e: any) => {
                            formSeo.value.meta_description = e.target.value;
                            selectedPostId.value = post.id as number;
                          }}
                          placeholder={translateApp(lang, 'seo.metaDescription')}
                          class="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                        />
                        <button
                          onClick$={() => saveSeo(post.id as number)}
                          disabled={selectedPostId.value !== post.id}
                          class="w-full rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
                        >
                          {translateApp(lang, 'seo.save')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Blog - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage blog posts',
    },
  ],
};
