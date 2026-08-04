import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, Form, zod$, z, Link } from '@builder.io/qwik-city';
import {
  EditingLocaleFieldsShell,
  FieldTranslationGlobe,
  TranslationsFormRoot,
} from '../../../../../components/admin/PerFieldContentTranslations';
import {
  AdminContentLanguageFields,
  ADMIN_CONTENT_FIELDS_GRID_CLASS,
} from '../../../../../components/admin/AdminContentLanguageFields';
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
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_SIDEBAR_CARD_CLASS,
  ADMIN_FORM_TEXTAREA_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';

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
        <Link href={R.ADMIN.BLOG} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      <Form action={createAction}>
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

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
          <div class="space-y-6">
            <div class={ADMIN_FORM_CARD_CLASS}>
              <div class={ADMIN_CONTENT_FIELDS_GRID_CLASS}>
                <TranslationsFormRoot
                  kind="blog"
                  locales={translationSecondaries}
                  initialJson={blogTranslationsJson}
                  rtlBadge={translateApp(lang, 'contentTranslations.rtlBadge')}
                  fallbackHintShort={translateApp(lang, 'contentTranslations.fallbackPlaceholderHint')}
                >
                  <AdminContentLanguageFields
                    lang={lang}
                    siteLanguages={langConfig.value.site_languages}
                    defaultLocale={langConfig.value.default_locale}
                    contentLocale={contentLocaleDraft}
                    editingLocale={editingLocaleDraft}
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
                        <label for="title" class={ADMIN_FORM_LABEL_CLASS}>
                          {translateApp(lang, 'blog.name')} *
                        </label>
                        <input
                          id="title"
                          name="title"
                          type="text"
                          required
                          onBlur$={contentSlugDom.onTitleBlur$}
                          class={ADMIN_FORM_INPUT_CLASS}
                          placeholder={translateApp(lang, 'blog.name')}
                        />
                        {createAction.value?.failed && createAction.value.fieldErrors?.title && (
                          <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                            {createAction.value.fieldErrors.title}
                          </p>
                        )}
                      </div>
                    </FieldTranslationGlobe>

                    <div>
                      <label for="slug" class={ADMIN_FORM_LABEL_CLASS}>
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
                        class={`${ADMIN_FORM_INPUT_CLASS} font-mono text-xs`}
                      />
                      <AdminPublicPageLink lang={lang} kind="blog" slug={slugLiveForPublicLink.value} />
                    </div>

                    <FieldTranslationGlobe
                      fieldKey="excerpt"
                      gridSpan="full"
                      globeAriaLabel={translateApp(lang, 'contentTranslations.globeExcerpt')}
                      fallbackText=""
                    >
                      <div>
                        <label for="excerpt" class={ADMIN_FORM_LABEL_CLASS}>
                          {translateApp(lang, 'blog.excerpt')}
                        </label>
                        <textarea
                          id="excerpt"
                          name="excerpt"
                          rows={3}
                          class={ADMIN_FORM_TEXTAREA_CLASS}
                        />
                      </div>
                    </FieldTranslationGlobe>

                    <FieldTranslationGlobe
                      fieldKey="content"
                      gridSpan="full"
                      globeAriaLabel={translateApp(lang, 'contentTranslations.globeContent')}
                      fallbackText=""
                      secondaryTextareaRows={12}
                    >
                      <div>
                        <label for="content" class={ADMIN_FORM_LABEL_CLASS}>
                          {translateApp(lang, 'blog.content')}
                        </label>
                        <textarea
                          id="content"
                          name="content"
                          rows={14}
                          class={ADMIN_FORM_TEXTAREA_CLASS}
                        />
                      </div>
                    </FieldTranslationGlobe>
                  </EditingLocaleFieldsShell>
                </TranslationsFormRoot>
              </div>
            </div>

            {createAction.value?.failed && (createAction.value as any).error && (
              <div class="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                {(createAction.value as any).error}
              </div>
            )}
          </div>

          <aside class="space-y-4 lg:sticky lg:top-24">
            <div class={ADMIN_FORM_SIDEBAR_CARD_CLASS}>
              <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'blog.publish')}
              </h3>
              <div class="space-y-3">
                <div>
                  <label for="status" class={ADMIN_FORM_LABEL_CLASS}>
                    {translateApp(lang, 'blog.status')}
                  </label>
                  <select id="status" name="status" class={ADMIN_NATIVE_SELECT_CLASS}>
                    <option class={ADMIN_NATIVE_OPTION_CLASS} value="draft">
                      {translateApp(lang, 'blog.statusDraft')}
                    </option>
                    <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
                      {translateApp(lang, 'blog.statusPublished')}
                    </option>
                    <option class={ADMIN_NATIVE_OPTION_CLASS} value="archived">
                      {translateApp(lang, 'blog.statusArchived')}
                    </option>
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
                  <label for="featured" class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'blog.featured')}
                  </label>
                </div>

                <div>
                  <label for="published_at" class={ADMIN_FORM_LABEL_CLASS}>
                    {translateApp(lang, 'blog.publishedAt')}
                  </label>
                  <input
                    id="published_at"
                    name="published_at"
                    type="datetime-local"
                    class={ADMIN_FORM_INPUT_CLASS}
                  />
                </div>

                <div class="flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={createAction.isRunning}
                    class={ADMIN_PRIMARY_BUTTON_CLASS}
                  >
                    {createAction.isRunning
                      ? translateApp(lang, 'common.loading')
                      : translateApp(lang, 'common.save')}
                  </button>
                  <Link href={R.ADMIN.BLOG} class={`${ADMIN_BACK_BUTTON_CLASS} text-center`}>
                    {translateApp(lang, 'common.cancel')}
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Form>
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
