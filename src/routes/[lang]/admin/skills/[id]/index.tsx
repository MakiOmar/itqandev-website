import { component$, useSignal, $, useTask$, untrack } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { routesFromPreferredCookie, useAppRoutes } from '../../../../../lib/constants/routes';
import { usePublicSiteMeta } from '../../layout';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  mergeSkillFieldsForUiLocale,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { mapSkillFromApi, runSkillUpdateFromBrowser } from '../../../../../lib/admin/skill-actions';
import type { Skill } from '../../../../../types';
import { useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';
import { ContentSeoFields } from '../../../../../components/admin/ContentSeoFields';
import { putContentSeo } from '../../../../../lib/admin/content-seo-put';
import {
  contentSeoDraftFromRow,
  emptyContentSeoDraft,
  mergeContentSeoDraftFromContent,
  type ContentSeoDraft,
  type ContentSeoMetaRow,
} from '../../../../../types/content-seo';

export const useSkillForEdit = routeLoader$(async ({ params, cookie, request, fail, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  try {
    const id = params.id;
    if (id === 'new') {
      throw redirectFn(302, R.ADMIN.SKILLS_NEW);
    }
    if (!id) {
      return fail(404, { message: 'Skill not found' });
    }
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.SKILLS.GET(id));
    const raw = (response as { data?: unknown })?.data ?? response;
    if (!raw || typeof raw !== 'object' || (raw as { id?: unknown }).id == null) {
      return fail(404, { message: 'Skill not found' });
    }
    return mapSkillFromApi(raw as Record<string, unknown>);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
    return fail(404, { message: 'Skill not found' });
  }
});

/** Edit skill — translations + SEO per editing locale. */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const skillLoader = useSkillForEdit();
  const liveSkill = useSignal<Skill | null>(null);

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
  const saveRunning = useSignal(false);

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    icon_hint: '',
  });

  const skillSlugIgnoreRecordId = useSignal<number | undefined>(undefined);
  const skillSlugAuto = useContentSlugAutosuggestForm('skills', formData, 'name', skillSlugIgnoreRecordId);

  useTask$(({ track }) => {
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const loaderSkill = track(() => skillLoader.value) as Skill | undefined;
    if (!loaderSkill?.id) return;
    const existing = liveSkill.value;
    if (existing == null || existing.id !== loaderSkill.id) {
      liveSkill.value = loaderSkill;
      skillSlugAuto.slugLocked.value = false;
    }
    const s = (liveSkill.value ?? loaderSkill) as Skill;
    skillSlugIgnoreRecordId.value = s.id != null ? Number(s.id) : undefined;
    contentLocaleDraft.value =
      s.content_locale != null && String(s.content_locale).trim() !== '' ? String(s.content_locale).trim() : '';
    canonicalName.value = s.name ?? '';
    canonicalDescription.value = s.description ?? '';
    formData.value = {
      name: s.name,
      slug: s.slug || '',
      description: s.description || '',
      icon_hint: s.iconHint || '',
    };
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = s.translations?.find((x) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return { locale: l.code, name: row?.name ?? '', description: row?.description ?? '' };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => liveSkill.value);
    track(() => skillLoader.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    track(() => contentLocaleDraft.value);
    const s = (liveSkill.value ?? skillLoader.value) as Skill | undefined;
    if (!s?.id) return;
    const m = mergeSkillFieldsForUiLocale(
      s,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    formData.value = {
      ...formData.value,
      name: m.name,
      description: m.description,
      slug: s.slug || formData.value.slug,
      icon_hint: s.iconHint || formData.value.icon_hint,
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
    track(() => skillLoader.value?.id);
    track(() => liveSkill.value?.id);
    const s = (liveSkill.value ?? skillLoader.value) as Skill | undefined;
    if (!s?.id) {
      return;
    }
    const rows = Array.isArray(s.seoMetas) ? s.seoMetas : [];
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

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => formData.value.name);
    track(() => formData.value.description);
    const prev = untrack(() => seoDraft.value);
    seoDraft.value = mergeContentSeoDraftFromContent(prev, {
      title: formData.value.name,
      descriptionCandidates: [formData.value.description],
    });
  });

  const handleSave = $(async () => {
    const s = (liveSkill.value ?? skillLoader.value) as Skill | undefined;
    if (!s?.id) return;

    saveRunning.value = true;
    const val = await runSkillUpdateFromBrowser({
      id: String(s.id),
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
    });

    if (!val.ok) {
      saveRunning.value = false;
      await showError(val.message || 'Failed to update skill');
      return;
    }

    const loc = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    ).toLowerCase();
    try {
      const apiClient = getApiClient();
      await putContentSeo(apiClient, 'skill', Number(s.id), loc, seoDraft.value);
    } catch (err: unknown) {
      saveRunning.value = false;
      const message = err instanceof Error ? err.message : 'Failed to save SEO';
      await showError(message);
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.updatedText });
    saveRunning.value = false;
    window.location.reload();
  });

  const skill = (liveSkill.value ?? skillLoader.value) as Skill | undefined;
  if (!skill?.id) {
    return (
      <div class="p-6 text-center text-gray-600 dark:text-gray-300">
        <p>{translateApp(lang, 'common.notFound') || 'Not found'}</p>
        <Link href={R.ADMIN.SKILLS} class="mt-2 inline-block text-primary-600">
          {translateApp(lang, 'common.back')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={translateApp(lang, 'skills.edit')} description={translateApp(lang, 'skills.subtitle')}>
        <Link
          href={R.ADMIN.SKILLS}
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
              const current = (liveSkill.value ?? skillLoader.value) as Skill | undefined;
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => {
                  const row = current?.translations?.find(
                    (x) => String(x?.locale).toLowerCase() === l.code.toLowerCase(),
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

            <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'seo.title')}
              </h3>
              <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'seo.forEditingLocale')}</p>
              <ContentSeoFields lang={lang} idPrefix={`skill-${skill.id}`} draft={seoDraft} />
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                preventdefault:click
                disabled={saveRunning.value}
                onClick$={handleSave}
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
              >
                {saveRunning.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.update')}
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
  title: 'Edit skill - Dashboard',
  meta: [{ name: 'description', content: 'Edit skill' }],
};
