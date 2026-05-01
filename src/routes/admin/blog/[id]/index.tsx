import { component$, useSignal, $, useVisibleTask$, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z, useLocation } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import {
  ContentEditingLanguageSelect,
  EditingLocaleFieldsShell,
  FieldTranslationGlobe,
  TranslationsFormRoot,
} from '../../../../components/admin/PerFieldContentTranslations';
import { initialTranslationsJson, parseTranslationsJson, secondaryLocalesForContent } from '../../../../lib/content-translations';
import {
  mergeBlogPostFieldsForUiLocale,
  mergeSecondaryBlogTranslations,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../lib/content-display-locale';
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
    const apiClient = getApiClient(cookieHeader, false);
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
      const apiClient = getApiClient(cookieHeader, false);
      const ui = String((data as { editing_locale?: string }).editing_locale || 'en').toLowerCase();
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en').toLowerCase();
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef).toLowerCase();
      const title = String(data.title || '');
      const excerpt = String(data.excerpt ?? '');
      const content = String(data.content ?? '');
      const canonicalTitle = String((data as { canonical_title?: string }).canonical_title ?? '');
      const canonicalExcerpt = String((data as { canonical_excerpt?: string }).canonical_excerpt ?? '');
      const canonicalContent = String((data as { canonical_content?: string }).canonical_content ?? '');

      const payload: BlogPostUpdateInput = {
        id: Number(params.id),
        title: ui === effectivePrimary ? title : canonicalTitle,
        slug: data.slug || undefined,
        excerpt: ui === effectivePrimary ? excerpt : canonicalExcerpt,
        content: ui === effectivePrimary ? content : canonicalContent,
        status: (data.status as any) || 'draft',
        featured: data.featured === true || data.featured === '1' || data.featured === 'on',
        publishedAt: data.published_at || undefined,
      };

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as BlogPostUpdateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      if (shouldWritePrimaryColumns(ui, effectivePrimary)) {
        if (parsedTranslations) {
          (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
        }
      } else {
        (payload as unknown as { translations?: unknown[] }).translations = mergeSecondaryBlogTranslations(
          (data as { translations_json?: string }).translations_json,
          ui,
          { title, excerpt, content },
        );
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
  zod$(
    blogPostSchema.extend({
      translations_json: z.string().optional(),
      content_locale: z.string().optional(),
      editing_locale: z.string().optional(),
      form_site_default_locale: z.string().optional(),
      effective_primary_locale: z.string().optional(),
      canonical_title: z.string().optional(),
      canonical_excerpt: z.string().optional(),
      canonical_content: z.string().optional(),
    }),
  )
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
  const { lang } = useTranslate();
  const { success, error: showError } = useSwal();
  const location = useLocation();
  const post = useBlogPost();
  const langConfig = useSiteLanguageConfig();
  const updateAction = useUpdateBlogPost();
  const uploadImageAction = useUploadFeaturedImage();

  // Pre-compute translation strings to avoid serialization issues
  const successTitle = translateApp(lang, 'common.success');

  const featuredImage = useSignal<any>((post.value as any)?.featured_image || null);
  const featuredImageFile = useSignal<File | null>(null);
  const showFeaturedImageSelector = useSignal(false);
  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(
    primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      post.value.content_locale ?? null,
    ),
  );
  const titleField = useSignal('');
  const excerptField = useSignal('');
  const contentField = useSignal('');

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
    if (post.value && typeof post.value === 'object') {
      const cl = (post.value as BlogPost).content_locale;
      contentLocaleDraft.value =
        cl != null && String(cl).trim() !== '' ? String(cl).trim() : '';
    }
  });

  // Main fields follow dashboard language (and draft primary locale), without mutating stored primary columns on save
  useTask$(({ track }) => {
    track(() => post.value);
    track(() => editingLocaleDraft.value);
    track(() => langConfig.value.default_locale);
    track(() => langConfig.value.site_languages);
    track(() => contentLocaleDraft.value);
    if (!post.value || typeof post.value !== 'object') {
      return;
    }
    const m = mergeBlogPostFieldsForUiLocale(
      post.value as BlogPost,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    titleField.value = m.title;
    excerptField.value = m.excerpt;
    contentField.value = m.content;
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

  const translationSecondaries = secondaryLocalesForContent(
    langConfig.value.site_languages,
    langConfig.value.default_locale,
    contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
  );
  const blogTranslationsJson = initialTranslationsJson(
    'blog',
    translationSecondaries,
    post.value.translations,
  );

  return (
    <>
      <PageHeader
        title={`${translateApp(lang, 'blog.edit')} #${location.params.id}`}
        description={translateApp(lang, 'blog.subtitle')}
      >
        <div class="flex gap-2">
          <Link
            href={ROUTES.ADMIN.BLOG}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'common.back')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <Form action={updateAction} class="space-y-6">
          {/* Hidden: map saves back to primary columns vs translation rows when dashboard language ≠ primary */}
          <input
            type="hidden"
            name="editing_locale"
            value={normalizeEditingLocale(
              editingLocaleDraft.value,
              langConfig.value.site_languages,
              langConfig.value.default_locale,
              contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
            )}
          />
          <input type="hidden" name="form_site_default_locale" value={langConfig.value.default_locale} />
          <input
            type="hidden"
            name="effective_primary_locale"
            value={primaryLocaleForContent(
              langConfig.value.site_languages,
              langConfig.value.default_locale,
              contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
            )}
          />
          <input type="hidden" name="canonical_title" value={(post.value as BlogPost).title ?? ''} />
          <input type="hidden" name="canonical_excerpt" value={(post.value as BlogPost).excerpt ?? ''} />
          <input type="hidden" name="canonical_content" value={(post.value as BlogPost).content ?? ''} />
          <div class="grid gap-4 md:grid-cols-2">
            <TranslationsFormRoot
              kind="blog"
              locales={translationSecondaries}
              initialJson={blogTranslationsJson}
              rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
              fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
            >
              <ContentEditingLanguageSelect
                siteLanguages={langConfig.value.site_languages}
                value={editingLocaleDraft.value}
                effectivePrimaryLocale={primaryLocaleForContent(
                  langConfig.value.site_languages,
                  langConfig.value.default_locale,
                  contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
                )}
                label={translateApp(lang, 'contentTranslations.sectionTitle')}
                hintPrimary={translateApp(lang, 'contentTranslations.defaultHint')}
                hintSecondary={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
                secondarySavePrefix={translateApp(lang, 'contentTranslations.addTranslations')}
                onChange$={$((code: string) => {
                  editingLocaleDraft.value = code;
                })}
              />

              <EditingLocaleFieldsShell
                variant="gridContents"
                siteLanguages={langConfig.value.site_languages}
                editingLocale={editingLocaleDraft}
              >
              {!translationSecondaries.length ? (
                <p class="md:col-span-2 text-sm text-gray-600 dark:text-gray-400">
                  {translateApp(lang, 'contentTranslations.noSecondaryLanguages')}
                </p>
              ) : null}

              <FieldTranslationGlobe
                fieldKey="title"
                gridSpan="one"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeTitle')}
                fallbackText={post.value.title ?? ''}
              >
                <div>
                  <label
                    for="title"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translateApp(lang, 'blog.name')} *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={titleField.value}
                    onInput$={(e) => {
                      titleField.value = (e.target as HTMLInputElement).value;
                    }}
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {updateAction.value?.failed && updateAction.value.fieldErrors?.title && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {updateAction.value.fieldErrors.title}
                    </p>
                  )}
                </div>
              </FieldTranslationGlobe>

              <div>
                <label
                  for="slug"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {translateApp(lang, 'blog.slug')}
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
                  {translateApp(lang, 'blog.status')}
                </label>
                <select
                  id="status"
                  name="status"
                  value={post.value.status}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  <option value="draft">{translateApp(lang, 'blog.statusDraft')}</option>
                  <option value="published">{translateApp(lang, 'blog.statusPublished')}</option>
                  <option value="archived">{translateApp(lang, 'blog.statusArchived')}</option>
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
                  {translateApp(lang, 'blog.featured')}
                </label>
              </div>

              <FieldTranslationGlobe
                fieldKey="excerpt"
                gridSpan="full"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeExcerpt')}
                fallbackText={post.value.excerpt || ''}
              >
                <div>
                  <label
                    for="excerpt"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translateApp(lang, 'blog.excerpt')}
                  </label>
                  <textarea
                    id="excerpt"
                    name="excerpt"
                    rows={2}
                    value={excerptField.value}
                    onInput$={(e) => {
                      excerptField.value = (e.target as HTMLTextAreaElement).value;
                    }}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </FieldTranslationGlobe>

              <FieldTranslationGlobe
                fieldKey="content"
                gridSpan="full"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeContent')}
                fallbackText={post.value.content || ''}
                secondaryTextareaRows={10}
              >
                <div>
                  <label
                    for="content"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translateApp(lang, 'blog.content')}
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    rows={10}
                    value={contentField.value}
                    onInput$={(e) => {
                      contentField.value = (e.target as HTMLTextAreaElement).value;
                    }}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </FieldTranslationGlobe>
              </EditingLocaleFieldsShell>
            </TranslationsFormRoot>

            <EditingLocaleFieldsShell
              siteLanguages={langConfig.value.site_languages}
              editingLocale={editingLocaleDraft}
            >
            <div>
              <label
                for="published_at"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {translateApp(lang, 'blog.publishedAt')}
              </label>
              <input
                id="published_at"
                name="published_at"
                type="datetime-local"
                value={post.value.publishedAt ? new Date(post.value.publishedAt).toISOString().slice(0, 16) : ''}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
            </EditingLocaleFieldsShell>
          </div>

          {/* Featured Image Section - Matching Blog List Page */}
          <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'blog.featuredImage') || 'Featured Image'}
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
                  {uploadImageAction.isRunning ? translateApp(lang, 'common.loading') : translateApp(lang, 'blog.uploadImage') || 'Upload Image'}
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
              {translateApp(lang, 'common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={updateAction.isRunning}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {updateAction.isRunning ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
            </button>
          </div>
        </Form>

        {/* Featured Image Selector Modal */}
        {showFeaturedImageSelector.value && (
          <div class="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
            <div class="container mx-auto max-w-screen-2xl p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {translateApp(lang, 'media.selectMedia') || 'Select Featured Image'}
                </h2>
                <button
                  onClick$={() => (showFeaturedImageSelector.value = false)}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {translateApp(lang, 'common.cancel')}
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
