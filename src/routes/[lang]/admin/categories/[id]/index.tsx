import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import { useSiteLanguageConfig } from '../../layout';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  mergeCategoryFieldsForUiLocale,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { runCategoryUpdateFromBrowser } from '../../../../../lib/admin/category-actions';
import type { Category } from '../../../../../types';
import { useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';
import { ContentSeoFields } from '../../../../../components/admin/ContentSeoFields';
import { putContentSeo } from '../../../../../lib/admin/content-seo-put';
import {
  contentSeoDraftFromRow,
  emptyContentSeoDraft,
  seoDraftToMetaRow,
  type ContentSeoDraft,
  type ContentSeoMetaRow,
} from '../../../../../types/content-seo';

function mapCategoryFromApi(raw: any): Category {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    content_locale: raw.content_locale ?? null,
    description: raw.description ?? '',
    isFeatured: Boolean(raw.is_featured ?? raw.isFeatured),
    projectsCount: raw.projects_count ?? raw.projectsCount,
    translations: Array.isArray(raw.translations) ? raw.translations : [],
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
    seoMetas: Array.isArray(raw.seoMetas)
      ? raw.seoMetas
      : Array.isArray((raw as Record<string, unknown>).seo_metas)
        ? ((raw as Record<string, unknown>).seo_metas as Category['seoMetas'])
        : undefined,
  };
}

export const useCategory = routeLoader$(async ({ params, cookie, request, fail }) => {
  try {
    const id = params.id;
    if (!id) {
      return fail(404, { message: 'Category not found' });
    }
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.GET(id));
    const raw = (response as any)?.data ?? response;
    if (!raw || raw.id == null) {
      return fail(404, { message: 'Category not found' });
    }
    return mapCategoryFromApi(raw);
  } catch {
    return fail(404, { message: 'Category not found' });
  }
});

/** Edit category — mirrors create form (primary language + translations). */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = useSiteLanguageConfig();
  const categoryLoader = useCategory();
  /** Latest category (loader or after save) so merge logic stays correct */
  const liveCategory = useSignal<Category | null>(null);

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    updatedText: String(translateApp(lang, 'common.updated')),
  };

  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalName = useSignal('');
  const canonicalDescription = useSignal('');
  const translationsJson = useSignal('[]');
  const seoDraft = useSignal<ContentSeoDraft>(emptyContentSeoDraft());
  const seoMetasDraft = useSignal<ContentSeoMetaRow[]>([]);
  const seoSaveRunning = useSignal(false);

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    is_featured: false,
  });

  const categorySlugIgnoreRecordId = useSignal<number | undefined>(undefined);

  const categorySlugAuto = useContentSlugAutosuggestForm(
    'categories',
    formData,
    'name',
    categorySlugIgnoreRecordId,
  );

  useTask$(({ track }) => {
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const loaderCat = track(() => categoryLoader.value) as Category | undefined;
    if (!loaderCat?.id) return;
    const existingCat = liveCategory.value;
    if (existingCat == null || existingCat.id !== loaderCat.id) {
      liveCategory.value = loaderCat;
      categorySlugAuto.slugLocked.value = false;
    }
    const c = (liveCategory.value ?? loaderCat) as Category;
    categorySlugIgnoreRecordId.value = c.id != null ? Number(c.id) : undefined;
    contentLocaleDraft.value =
      (c as any).content_locale != null && String((c as any).content_locale).trim() !== ''
        ? String((c as any).content_locale).trim()
        : '';
    canonicalName.value = c.name ?? '';
    canonicalDescription.value = c.description ?? '';
    formData.value = {
      name: c.name,
      slug: c.slug || '',
      description: c.description || '',
      is_featured: (c as any).isFeatured || false,
    };
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = (c as any).translations?.find((x: any) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return { locale: l.code, name: row?.name ?? '', description: row?.description ?? '' };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => liveCategory.value);
    track(() => categoryLoader.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    track(() => contentLocaleDraft.value);
    const c = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
    if (!c?.id) return;
    const m = mergeCategoryFieldsForUiLocale(
      c,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    categorySlugIgnoreRecordId.value = c.id != null ? Number(c.id) : undefined;
    formData.value = {
      ...formData.value,
      name: m.name,
      description: m.description,
      slug: c.slug || formData.value.slug,
      is_featured: (c as any).isFeatured || false,
    };
  });

  useTask$(({ track }) => {
    track(() => formData.value.name);
    track(() => formData.value.description);
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const eff = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    const edit = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    if (shouldWritePrimaryColumns(edit, eff)) {
      canonicalName.value = formData.value.name;
      canonicalDescription.value = formData.value.description;
    }
  });

  useTask$(({ track }) => {
    track(() => categoryLoader.value?.id);
    track(() => liveCategory.value?.id);
    const c = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
    if (!c?.id) {
      return;
    }
    const rows = Array.isArray(c.seoMetas) ? c.seoMetas : [];
    seoMetasDraft.value = rows.map((r) => ({
      id: typeof r.id === 'number' ? r.id : undefined,
      locale: String(r.locale ?? '').toLowerCase().trim(),
      meta_title: r.meta_title ?? '',
      meta_description: r.meta_description ?? '',
      canonical_url: r.canonical_url,
      og_title: r.og_title,
      og_description: r.og_description,
      og_image: r.og_image,
      twitter_card: r.twitter_card,
      schema: r.schema,
    }));
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.default_locale);
    track(() => langConfig.value.site_languages);
    track(() => seoMetasDraft.value);
    const loc = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    ).toLowerCase();
    const row = seoMetasDraft.value.find((r) => String(r.locale).toLowerCase() === loc);
    seoDraft.value = contentSeoDraftFromRow(row);
  });

  const saveCategorySeo = $(async () => {
    const c = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
    if (!c?.id) {
      return;
    }
    const loc = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    ).toLowerCase();
    seoSaveRunning.value = true;
    try {
      const apiClient = getApiClient();
      await putContentSeo(apiClient, 'category', Number(c.id), loc, seoDraft.value);
      const merged = seoDraftToMetaRow(loc, seoDraft.value);
      const next = [...seoMetasDraft.value];
      const idx = next.findIndex((r) => String(r.locale).toLowerCase() === loc);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...merged };
      } else {
        next.push(merged);
      }
      seoMetasDraft.value = next;
      const mergedBase = liveCategory.value ?? categoryLoader.value;
      if (mergedBase && typeof (mergedBase as Category).id === 'number') {
        liveCategory.value = { ...(mergedBase as Category), seoMetas: next };
      }
      await success(saveTranslations.successTitle, { text: saveTranslations.updatedText });
    } catch (err: any) {
      await showError(err?.message || 'Failed to save SEO');
    } finally {
      seoSaveRunning.value = false;
    }
  });

  const handleSave = $(async () => {
    const c = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
    if (!c?.id) return;

    const val = await runCategoryUpdateFromBrowser({
      id: String(c.id),
      editing_locale: normalizeEditingLocale(
        editingLocaleDraft.value,
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
      form_site_default_locale: langConfig.value.default_locale,
      effective_primary_locale: primaryLocaleForContent(
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
      canonical_name: canonicalName.value,
      canonical_description: canonicalDescription.value,
      translations_json: translationsJson.value,
      content_locale: contentLocaleDraft.value,
      name: formData.value.name,
      slug: formData.value.slug,
      description: formData.value.description,
      is_featured: formData.value.is_featured ? '1' : undefined,
    });

    if (!val.ok) {
      await showError(val.message || 'Failed to update category');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.updatedText });
    window.location.reload();
  });

  const cat = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
  if (!cat?.id) {
    return (
      <div class="p-6 text-center text-gray-600 dark:text-gray-300">
        <p>{translateApp(lang, 'common.notFound') || 'Not found'}</p>
        <Link href={R.ADMIN.CATEGORIES} class="mt-2 inline-block text-primary-600">
          {translateApp(lang, 'common.back')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={translateApp(lang, 'categories.edit')} description={translateApp(lang, 'categories.subtitle')}>
        <Link
          href={R.ADMIN.CATEGORIES}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      <div class="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="space-y-4">
          <ContentPrimaryLanguageSelect
            siteLanguages={langConfig.value.site_languages}
            defaultLocale={langConfig.value.default_locale}
            value={contentLocaleDraft.value}
            label={translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}
            hint={translateApp(lang, 'contentTranslations.contentPrimaryHint')}
            useSiteDefaultLabel={translateApp(lang, 'contentTranslations.useSiteDefault')}
            onChange$={$((code: string) => {
              contentLocaleDraft.value = code;
              const c = (liveCategory.value ?? categoryLoader.value) as Category | undefined;
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => {
                  const row = (c as any)?.translations?.find(
                    (x: any) => String(x?.locale).toLowerCase() === l.code.toLowerCase(),
                  );
                  return { locale: l.code, name: row?.name ?? '', description: row?.description ?? '' };
                }),
              );
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
            siteLanguages={langConfig.value.site_languages}
            editingLocale={editingLocaleDraft}
          >
          <div>
            <label for="name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'categories.name')} *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.value.name}
              onInput$={(e) => (formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value })}
              onBlur$={categorySlugAuto.onTitleBlurSuggestSlug$}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              required
            />
          </div>

          <div>
            <label for="slug" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'categories.slug')}
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.value.slug}
              onInput$={$((e) => {
                categorySlugAuto.slugLocked.value = true;
                formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
              })}
              onBlur$={categorySlugAuto.onSlugBlurEnsureUnique$}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="description" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'categories.description')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.value.description}
              onInput$={(e) =>
                (formData.value = { ...formData.value, description: (e.target as HTMLTextAreaElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              id="is_featured"
              name="is_featured"
              type="checkbox"
              value="1"
              checked={formData.value.is_featured}
              onChange$={(e) =>
                (formData.value = { ...formData.value, is_featured: (e.target as HTMLInputElement).checked })
              }
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="is_featured" class="text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'categories.featured')}
            </label>
          </div>

          <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'seo.title')}</h3>
            {/* <!-- SEO row per editing locale --> */}
            <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'seo.forEditingLocale')}</p>
            <ContentSeoFields lang={lang} idPrefix="category" draft={seoDraft} />
            <button
              type="button"
              disabled={seoSaveRunning.value}
              onClick$={saveCategorySeo}
              class="mt-3 w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {seoSaveRunning.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'seo.save')}
            </button>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              preventdefault:click
              onClick$={handleSave}
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              {translateApp(lang, 'common.update')}
            </button>
            <Link
              href={R.ADMIN.CATEGORIES}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.cancel')}
            </Link>
          </div>
          </EditingLocaleFieldsShell>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit category - Dashboard',
  meta: [{ name: 'description', content: 'Edit category' }],
};
