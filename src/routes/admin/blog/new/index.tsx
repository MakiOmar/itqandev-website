import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, Form, zod$, z, Link } from '@builder.io/qwik-city';
import { ContentTranslationsPanel } from '../../../../components/admin/ContentTranslationsPanel';
import { initialTranslationsJson, parseTranslationsJson } from '../../../../lib/content-translations';
import { useSiteLanguageConfig } from '../../../../lib/loaders/site-language-config';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { ROUTES } from '../../../../lib/constants/routes';
import type { BlogPost, BlogPostCreateInput } from '../../../../types';

/**
 * Blog post creation schema
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
 * Create blog post action
 */
export const useCreateBlogPost = routeAction$(
  async (data, { cookie, request, redirect: redirectFn }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request);
      const apiClient = getApiClient(cookieHeader);
      const payload: BlogPostCreateInput = {
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

      const response = await apiClient.post<BlogPost>(API_ENDPOINTS.BLOG.CREATE, payload);
      const post = (response?.data ?? response) as any;

      // Redirect to edit page
      throw redirectFn(302, ROUTES.ADMIN.BLOG_EDIT(post.id));
    } catch (error: any) {
      if (error.status === 302 || error.statusCode === 302) {
        throw error; // Re-throw redirects
      }
      // Return error response instead of throwing
      return {
        success: false,
        error: error.message || 'Failed to create blog post',
      };
    }
  },
  zod$(blogPostSchema.extend({ translations_json: z.string().optional() }))
);

/**
 * Blog post create page
 */
export default component$(() => {
  const { t } = useTranslate();
  const langConfig = useSiteLanguageConfig();
  const createAction = useCreateBlogPost();

  const blogTranslationsJson = initialTranslationsJson('blog', langConfig.value.secondary, null);

  return (
    <>
      <PageHeader
        title={t('blog.addNew')}
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
        <Form action={createAction} class="space-y-6">
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
                required
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
              {createAction.value?.failed && createAction.value.fieldErrors?.title && (
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  {createAction.value.fieldErrors.title}
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
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
          </div>

          {createAction.value?.failed && (createAction.value as any).error && (
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              {(createAction.value as any).error}
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
              disabled={createAction.isRunning}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {createAction.isRunning ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Form>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Create Blog Post - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Create a new blog post',
    },
  ],
};
