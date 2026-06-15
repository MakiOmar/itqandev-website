import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useNavigate, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
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
import { useCreateSkill } from '../../../../../lib/admin/skill-actions';
import { submitRouteActionFormData } from '../../../../../lib/admin/route-action-form-submit';
import { adminSkillEditHref, getLocalizedRoutes, useAppRoutes } from '../../../../../lib/constants/routes';
import type { Skill } from '../../../../../types';
import { useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';

/**
 * Create skill — primary language on insert; translations on edit page after redirect.
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const langConfig = usePublicSiteMeta();
  const createAction = useCreateSkill();

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
    icon_hint: '',
  });

  const skillSlugAuto = useContentSlugAutosuggestForm('skills', formData, 'name');

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
    const val = await submitRouteActionFormData(
      createAction,
      {
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
        icon_hint: formData.value.icon_hint,
      },
      (x) =>
        x != null &&
        typeof x === 'object' &&
        ('success' in (x as object) || 'skill' in (x as object) || 'failed' in (x as object)),
    );

    if (val?.failed) {
      await showError(val.message || val.error || 'Failed to create skill');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.createdText });
    const created = val?.skill as Skill | undefined;
    if (created?.id != null) {
      await navigate(adminSkillEditHref(lang, created.id));
    } else {
      await navigate(getLocalizedRoutes(lang).ADMIN.SKILLS);
    }
  });

  return (
    <>
      <PageHeader title={translateApp(lang, 'skills.addNew')} description={translateApp(lang, 'skills.subtitle')}>
        <Link
          href={R.ADMIN.SKILLS}
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

          <EditingLocaleFieldsShell siteLanguages={langConfig.value.site_languages} editingLocale={editingLocaleDraft}>
            <div>
              <label for="name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'skills.name')} *
              </label>
              <input
                id="name"
                type="text"
                value={formData.value.name}
                onInput$={(e) => (formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value })}
                onBlur$={skillSlugAuto.onTitleBlurSuggestSlug$}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                required
              />
            </div>

            <div>
              <label for="slug" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'skills.slug')}
              </label>
              <input
                id="slug"
                type="text"
                value={formData.value.slug}
                onInput$={$((e) => {
                  skillSlugAuto.slugLocked.value = true;
                  formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
                })}
                onBlur$={skillSlugAuto.onSlugBlurEnsureUnique$}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label for="icon_hint" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'skills.iconHint')}
              </label>
              <input
                id="icon_hint"
                type="text"
                value={formData.value.icon_hint}
                onInput$={(e) =>
                  (formData.value = { ...formData.value, icon_hint: (e.target as HTMLInputElement).value })
                }
                placeholder="e.g., ⚡, 🚀, 💻"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label for="description" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'skills.description')}
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.value.description}
                onInput$={(e) =>
                  (formData.value = { ...formData.value, description: (e.target as HTMLTextAreaElement).value })
                }
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                preventdefault:click
                onClick$={handleSave}
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'common.add')}
              </button>
              <Link
                href={R.ADMIN.SKILLS}
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
  title: 'New skill - Dashboard',
  meta: [{ name: 'description', content: 'Create a skill' }],
};
