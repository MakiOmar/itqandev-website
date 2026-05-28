import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useNavigate, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { useSiteLanguageConfig } from '../../layout';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { runCategoryCreateFromBrowser } from '../../../../../lib/admin/category-actions';
import { adminCategoryEditHref, getLocalizedRoutes, useAppRoutes } from '../../../../../lib/constants/routes';
import { suggestUniqueContentSlug, useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';

/**
 * Create category — primary language only on insert
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const langConfig = useSiteLanguageConfig();
  const saveRunning = useSignal(false);

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    createdText: String(translateApp(lang, 'common.created')),
  };

  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalName = useSignal('');
  const canonicalDescription = useSignal('');
  const translationsJson = useSignal('[]');

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    is_featured: false,
  });

  const categorySlugAuto = useContentSlugAutosuggestForm('categories', formData, 'name');

  useTask$(({ track }) => {
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => ({ locale: l.code, name: '', description: '' })),
    );
  });

  // Keep canonical primary text in sync while editing the primary language (required for secondary-locale saves).
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

  const handleSave = $(async () => {
    if (saveRunning.value) {
      return;
    }
    saveRunning.value = true;

    let slug = formData.value.slug.trim();
    if (!slug && formData.value.name.trim()) {
      const suggested = await suggestUniqueContentSlug('categories', formData.value.name);
      if (suggested) {
        slug = suggested;
        formData.value = { ...formData.value, slug };
      }
    }

    const val = await runCategoryCreateFromBrowser({
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
      slug,
      description: formData.value.description,
      is_featured: formData.value.is_featured ? '1' : undefined,
    });

    if (!val.ok) {
      saveRunning.value = false;
      await showError(val.message || 'Failed to create category');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.createdText });
    saveRunning.value = false;
    const created = val.value.category;
    if (created?.id != null) {
      await navigate(adminCategoryEditHref(lang, created.id));
    } else {
      await navigate(getLocalizedRoutes(lang).ADMIN.CATEGORIES);
    }
  });

  return (
    <>
      <PageHeader title={translateApp(lang, 'categories.addNew')} description={translateApp(lang, 'categories.subtitle')}>
        <Link
          href={R.ADMIN.CATEGORIES}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'common.back') || 'Back'}
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
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => ({ locale: l.code, name: '', description: '' })),
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

          <div class="flex gap-2">
            <button
              type="button"
              preventdefault:click
              disabled={saveRunning.value}
              onClick$={handleSave}
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveRunning.value
                ? translateApp(lang, 'common.saving') || translateApp(lang, 'common.add')
                : translateApp(lang, 'common.add')}
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
  title: 'New category - Dashboard',
  meta: [{ name: 'description', content: 'Create a category' }],
};
