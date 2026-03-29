import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z, useLocation } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { ContentTranslationsPanel } from '../../../../components/admin/ContentTranslationsPanel';
import { initialTranslationsJson, parseTranslationsJson } from '../../../../lib/content-translations';
import { useSiteLanguageConfig } from '../../layout';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { ROUTES } from '../../../../lib/constants/routes';
import type { BlogPost, BlogPostUpdateInput } from '../../../../types';

/**
 * Blog post update schema
 */
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.union([z.boolean(), z.string()]).optional(),
  published_at: z.string().optional(),
});

/**
 * Load blog post data
 */
export const useBlogPost = routeLoader$(async ({ params, fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<BlogPost>(API_ENDPOINTS.BLOG.GET(params.id));
    return (response?.data ?? response) as BlogPost;
  } catch (error: any) {
    return fail(404, { message: error.message || 'Blog post not found' });
  }
});

/**
 * Update blog post action
 */
export const useUpdateBlogPost = routeAction$(
  async (data, { params, cookie, request, redirect: redirectFn }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request);
      const apiClient = getApiClient(cookieHeader);
      const payload: BlogPostUpdateInput = {
        id: Number(params.id),
        title: data.title,
        slug: data.slug || undefined,
        excerpt: data.excerpt || undefined,
        content: data.content || undefined,
        status: (data.status as any) || 'draft',
        featured: data.featured === true || data.featured === '1' || data.featured === 'on',
        publishedAt: data.published_at || undefined,
      };

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      if (parsedTranslations) {
        (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
      }

      await apiClient.put(API_ENDPOINTS.BLOG.UPDATE(params.id), payload);

      // Redirect to blog list
      throw redirectFn(302, ROUTES.ADMIN.BLOG);
    } catch (error: any) {
      if (error.status === 302 || error.statusCode === 302) {
        throw error; // Re-throw redirects
      }
      // Return error response instead of throwing
      return {
        success: false,
        error: error.message || 'Failed to update blog post',
      };
    }
  },
  zod$(blogPostSchema.extend({ translations_json: z.string().optional() }))
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
 * Blog post edit page
 */
export default component$(() => {
  const { t } = useTranslate();
  const { success, error: showError } = useSwal();
  const location = useLocation();
  const post = useBlogPost();
  const langConfig = useSiteLanguageConfig();
  const updateAction = useUpdateBlogPost();
  const uploadImageAction = useUploadFeaturedImage();

  // Pre-compute translation strings to avoid serialization issues
  const successTitle = t('common.success');

  const featuredImage = useSignal<any>((post.value as any)?.featured_image || null);
  const featuredImageFile = useSignal<File | null>(null);
  const showFeaturedImageSelector = useSignal(false);

  // Handle postMessage from media iframe
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const handleMessage = $((event: MessageEvent) => {
      if (event.data?.type === 'media-selected') {
        const media = event.data.media;
        const callback = event.data.callback;
        
        if (callback === 'featured_image') {
          featuredImage.value = media;
          showFeaturedImageSelector.value = false;
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      cleanup(() => {
        window.removeEventListener('message', handleMessage);
      });
    }
  });

  // Load featured image when post loads
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => post.value);
    if (post.value && (post.value as any).featured_image) {
      featuredImage.value = (post.value as any).featured_image;
    }
  });

  const uploadFeaturedImage = $(async () => {
    if (!featuredImageFile.value) return;

    const formData = new FormData();
    formData.append('file', featuredImageFile.value);
    formData.append('postId', location.params.id);

    const response = await uploadImageAction.submit(formData);
    if (response.value?.failed) {
      const errorMsg = (response.value as any).message || 'Failed to upload image';
      await showError(errorMsg);
    } else {
      await success(successTitle, { text: 'Featured image uploaded' });
      featuredImageFile.value = null;
      // Reload post to get updated featured image
      window.location.reload();
    }
  });

  if (!post.value) {
    return (
      <div class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const blogTranslationsJson = initialTranslationsJson(
    'blog',
    langConfig.value.secondary,
    post.value.translations,
  );

  return (
    <>
      <PageHeader
        title={`${t('blog.edit')} #${location.params.id}`}
        description={t('blog.subtitle')}
      >
        <div class="flex gap-2">
          <Link
            href={ROUTES.ADMIN.BLOG}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {t('common.back')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <Form action={updateAction} class="space-y-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label
                for="title"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.name')} *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={post.value.title}
                required
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
              {updateAction.value?.failed && updateAction.value.fieldErrors?.title && (
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  {updateAction.value.fieldErrors.title}
                </p>
              )}
            </div>

            <div>
              <label
                for="slug"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.slug')}
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                value={post.value.slug || ''}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label
                for="status"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.status')}
              </label>
              <select
                id="status"
                name="status"
                value={post.value.status}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              >
                <option value="draft">{t('blog.statusDraft')}</option>
                <option value="published">{t('blog.statusPublished')}</option>
                <option value="archived">{t('blog.statusArchived')}</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input
                id="featured"
                name="featured"
                type="checkbox"
                checked={post.value.featured}
                value="1"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                for="featured"
                class="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.featured')}
              </label>
            </div>

            <div class="md:col-span-2">
              <label
                for="excerpt"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.excerpt')}
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                rows={2}
                value={post.value.excerpt || ''}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div class="md:col-span-2">
              <label
                for="content"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.content')}
              </label>
              <textarea
                id="content"
                name="content"
                rows={10}
                value={post.value.content || ''}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div class="md:col-span-2">
              <ContentTranslationsPanel
                kind="blog"
                locales={langConfig.value.secondary}
                initialJson={blogTranslationsJson}
                labels={{
                  addTranslations: t('contentTranslations.addTranslations'),
                  collapseTranslations: t('contentTranslations.collapseTranslations'),
                  sectionTitle: t('contentTranslations.sectionTitle'),
                  defaultHint: t('contentTranslations.defaultHint'),
                  noLanguages: t('contentTranslations.noSecondaryLanguages'),
                  rtlBadge: t('contentTranslations.rtlBadge'),
                  title: t('blog.name'),
                  summary: '',
                  description: '',
                  excerpt: t('blog.excerpt'),
                  content: t('blog.content'),
                }}
              />
            </div>

            <div>
              <label
                for="published_at"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('blog.publishedAt')}
              </label>
              <input
                id="published_at"
                name="published_at"
                type="datetime-local"
                value={post.value.publishedAt ? new Date(post.value.publishedAt).toISOString().slice(0, 16) : ''}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
          </div>

          {/* Featured Image Section - Matching Blog List Page */}
          <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('blog.featuredImage') || 'Featured Image'}
            </h3>
            {featuredImage.value ? (
              <div class="mb-3 flex items-center gap-3">
                {featuredImage.value.url ? (
                  <img
                    src={featuredImage.value.url}
                    alt={featuredImage.value.alt_text || featuredImage.value.name || ''}
                    width="96"
                    height="96"
                    class="h-24 w-24 rounded-lg border border-gray-300 object-cover dark:border-gray-700"
                  />
                ) : featuredImage.value.file ? (
                  <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                    <img
                      src={featuredImage.value.preview || ''}
                      alt={featuredImage.value.file?.name || ''}
                      width="96"
                      height="96"
                      class="h-full w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {featuredImage.value.name || featuredImage.value.file?.name || ''}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {featuredImage.value.size
                      ? `${(featuredImage.value.size / 1024).toFixed(2)} KB`
                      : featuredImage.value.file?.size
                        ? `${(featuredImage.value.file.size / 1024).toFixed(2)} KB`
                        : ''}{' '}
                    · {featuredImage.value.mime_type || featuredImage.value.file?.type || ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick$={() => {
                    featuredImage.value = null;
                    featuredImageFile.value = null;
                  }}
                  class="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">No featured image selected.</div>
            )}
            <div class="flex gap-2">
              <input
                type="file"
                accept="image/*"
                id="featured-image-file-input"
                class="hidden"
                onChange$={(e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const preview = URL.createObjectURL(file);
                  featuredImageFile.value = file;
                  featuredImage.value = {
                    file,
                    preview,
                    name: file.name,
                    size: file.size,
                    mime_type: file.type,
                  };
                  if (e.target) {
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick$={() => {
                  document.getElementById('featured-image-file-input')?.click();
                }}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Upload File
              </button>
              {featuredImageFile.value && (
                <button
                  type="button"
                  onClick$={uploadFeaturedImage}
                  disabled={uploadImageAction.isRunning}
                  class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {uploadImageAction.isRunning ? t('common.loading') : t('blog.uploadImage') || 'Upload Image'}
                </button>
              )}
              <button
                type="button"
                onClick$={() => {
                  showFeaturedImageSelector.value = true;
                }}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {featuredImage.value ? 'Change Image' : 'Select from Library'}
              </button>
            </div>
          </div>

          {updateAction.value?.failed && (updateAction.value as any).error && (
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              {(updateAction.value as any).error}
            </div>
          )}

          <div class="flex justify-end gap-2">
            <Link
              href={ROUTES.ADMIN.BLOG}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={updateAction.isRunning}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {updateAction.isRunning ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Form>

        {/* Featured Image Selector Modal */}
        {showFeaturedImageSelector.value && (
          <div class="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
            <div class="container mx-auto max-w-screen-2xl p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('media.selectMedia') || 'Select Featured Image'}
                </h2>
                <button
                  onClick$={() => (showFeaturedImageSelector.value = false)}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
              <iframe
                src={`${ROUTES.ADMIN.MEDIA}?select=true&accept=image/*&callback=featured_image`}
                class="w-full h-[calc(100vh-200px)] border border-gray-200 rounded-lg dark:border-gray-700"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit Blog Post - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Edit blog post',
    },
  ],
};
