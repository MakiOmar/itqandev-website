import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, Form, zod$, z, Link } from '@builder.io/qwik-city';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
  FieldTranslationGlobe,
  TranslationsFormRoot,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { initialTranslationsJson, parseTranslationsJson, secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  mergeSecondaryBlogTranslations,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { usePublicSiteMeta } from '../../layout';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { adminBlogEditHref, useAppRoutes } from '../../../../../lib/constants/routes';
import { uiLangFromPreferredCookie } from '../../../../../lib/i18n/ui-locale-path';
import type { BlogPost, BlogPostCreateInput } from '../../../../../types';
import { useContentSlugAutosuggestDom } from '../../../../../lib/slug/content-slug-auto';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';

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
      const lang = uiLangFromPreferredCookie(cookie);
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

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as BlogPostCreateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
        }
      } else {
        (payload as unknown as { translations?: unknown[] }).translations = mergeSecondaryBlogTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          {
            title: String(data.title || ''),
            excerpt: String(data.excerpt ?? ''),
            content: String(data.content ?? ''),
          },
        );
      }

      const response = await apiClient.post<BlogPost>(API_ENDPOINTS.BLOG.CREATE, payload);
      const post = (response?.data ?? response) as any;

      // Redirect to edit page
      throw redirectFn(302, adminBlogEditHref(lang, post.id));
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
  zod$(
    blogPostSchema.extend({
      translations_json: z.string().optional(),
      content_locale: z.string().optional(),
      editing_locale: z.string().optional(),
      form_site_default_locale: z.string().optional(),
      effective_primary_locale: z.string().optional(),
    }),
  )
);

/**
 * Blog post create page
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const langConfig = usePublicSiteMeta();
  const createAction = useCreateBlogPost();
  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);

  const contentSlugDom = useContentSlugAutosuggestDom({ entity: 'blog_posts' });
  /** Keeps “view public page” URL in sync while typing slug on this uncontrolled form */
  const slugLiveForPublicLink = useSignal('');

  const translationSecondaries = secondaryLocalesForContent(
    langConfig.value.site_languages,
    langConfig.value.default_locale,
    contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
  );
  const blogTranslationsJson = initialTranslationsJson('blog', translationSecondaries, null);

  return (
    <>
      <PageHeader
        title={translateApp(lang, 'blog.addNew')}
        description={translateApp(lang, 'blog.subtitle')}
      >
        <div class="flex gap-2">
          <Link
            href={R.ADMIN.BLOG}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'common.back')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <Form action={createAction} class="space-y-6">
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
          <div class="grid gap-4 md:grid-cols-2">
            <TranslationsFormRoot
              kind="blog"
              locales={translationSecondaries}
              initialJson={blogTranslationsJson}
              rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
              fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
            >
              <ContentPrimaryLanguageSelect
                siteLanguages={langConfig.value.site_languages}
                defaultLocale={langConfig.value.default_locale}
                value={contentLocaleDraft.value}
                label={translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}
                hint={translateApp(lang, 'contentTranslations.contentPrimaryHint')}
                useSiteDefaultLabel={translateApp(lang, 'contentTranslations.useSiteDefault')}
                onChange$={$((code: string) => {
                  contentLocaleDraft.value = code;
                })}
              />

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
                fallbackText=""
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
                    required
                    onBlur$={contentSlugDom.onTitleBlur$}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {createAction.value?.failed && createAction.value.fieldErrors?.title && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {createAction.value.fieldErrors.title}
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
                  onInput$={$((ev: InputEvent) => {
                    slugLiveForPublicLink.value = String((ev.target as HTMLInputElement).value ?? '');
                    contentSlugDom.onSlugInput$();
                  })}
                  onBlur$={$(async (ev: FocusEvent) => {
                    await contentSlugDom.onSlugBlur$(ev);
                    slugLiveForPublicLink.value = String((ev.target as HTMLInputElement).value ?? '');
                  })}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
                <AdminPublicPageLink lang={lang} kind="blog" slug={slugLiveForPublicLink.value} />
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
                fallbackText=""
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
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </FieldTranslationGlobe>

              <FieldTranslationGlobe
                fieldKey="content"
                gridSpan="full"
                globeAriaLabel={translateApp(lang, 'contentTranslations.globeContent')}
                fallbackText=""
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
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
            </EditingLocaleFieldsShell>
          </div>

          {createAction.value?.failed && (createAction.value as any).error && (
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              {(createAction.value as any).error}
            </div>
          )}

          <div class="flex justify-end gap-2">
            <Link
              href={R.ADMIN.BLOG}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={createAction.isRunning}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {createAction.isRunning ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
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
