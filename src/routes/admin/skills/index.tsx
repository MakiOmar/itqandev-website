import { component$, useSignal, $, useComputed$, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, zod$, z } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import type { Skill, SkillCreateInput, SkillUpdateInput } from '../../../types';
import { useSiteLanguageConfig } from '../layout';
import { useLocaleAwareList } from '../../../lib/hooks/useLocaleAwareList';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../components/admin/PerFieldContentTranslations';
import { parseTranslationsJson, secondaryLocalesForContent } from '../../../lib/content-translations';
import {
  mergeSecondarySkillTranslations,
  mergeSkillFieldsForUiLocale,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../lib/content-display-locale';

/**
 * Skill schema
 */
const skillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon_hint: z.string().optional(),
  content_locale: z.string().optional(),
  editing_locale: z.string().optional(),
  form_site_default_locale: z.string().optional(),
  effective_primary_locale: z.string().optional(),
  canonical_name: z.string().optional(),
  canonical_description: z.string().optional(),
  translations_json: z.string().optional(),
});

/**
 * Load skills
 */
export const useSkills = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST);
    
    // Handle paginated response
    if (response && 'data' in response && response.data) {
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data as Skill[];
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data as Skill[];
      }
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to load skills:', error);
    return [];
  }
});

/**
 * Create skill action
 */
export const useCreateSkill = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: SkillCreateInput = {
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || undefined,
      iconHint: data.icon_hint || undefined,
    };
    (payload as SkillCreateInput & { content_locale?: string | null }).content_locale =
      data.content_locale && data.content_locale.trim() !== '' ? data.content_locale : null;
    const parsedTranslations = parseTranslationsJson((data as any).translations_json);
    const siteDef = String((data as any).form_site_default_locale || 'en');
    const effectivePrimary = String((data as any).effective_primary_locale || siteDef);
    const editingLocale = String((data as any).editing_locale || effectivePrimary);
    const canonicalName = String((data as any).canonical_name ?? '');
    const canonicalDescription = String((data as any).canonical_description ?? '');
    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      if (parsedTranslations) {
        (payload as any).translations = parsedTranslations;
      }
    } else {
      (payload as any).name = canonicalName;
      (payload as any).description = canonicalDescription;
      (payload as any).translations = mergeSecondarySkillTranslations(
        (data as any).translations_json,
        editingLocale,
        { name: String(data.name || ''), description: String(data.description ?? '') },
      );
    }
    const response = await apiClient.post<Skill>(API_ENDPOINTS.SKILLS.CREATE, payload);
    return { success: true, skill: response?.data ?? response };
  },
  zod$(skillSchema)
);

/**
 * Update skill action
 */
export const useUpdateSkill = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: SkillUpdateInput = {
      id: Number(data.id),
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || undefined,
      iconHint: data.icon_hint || undefined,
    };
    (payload as SkillUpdateInput & { content_locale?: string | null }).content_locale =
      data.content_locale && data.content_locale.trim() !== '' ? data.content_locale : null;
    const parsedTranslations = parseTranslationsJson((data as any).translations_json);
    const siteDef = String((data as any).form_site_default_locale || 'en');
    const effectivePrimary = String((data as any).effective_primary_locale || siteDef);
    const editingLocale = String((data as any).editing_locale || effectivePrimary);
    const canonicalName = String((data as any).canonical_name ?? '');
    const canonicalDescription = String((data as any).canonical_description ?? '');
    if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
      if (parsedTranslations) {
        (payload as any).translations = parsedTranslations;
      }
    } else {
      (payload as any).name = canonicalName;
      (payload as any).description = canonicalDescription;
      (payload as any).translations = mergeSecondarySkillTranslations(
        (data as any).translations_json,
        editingLocale,
        { name: String(data.name || ''), description: String(data.description ?? '') },
      );
    }
    await apiClient.put(API_ENDPOINTS.SKILLS.UPDATE(String(data.id)), payload);
    return { success: true };
  },
  zod$(skillSchema.extend({ id: z.string() }))
);

/**
 * Delete skill action
 */
export const useDeleteSkill = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.delete(API_ENDPOINTS.SKILLS.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete skill' });
  }
});

/**
 * Bulk delete skills action
 */
export const useBulkDeleteSkills = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.post(API_ENDPOINTS.SKILLS.BULK_DELETE, { ids: data.ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete skills' });
  }
});

/**
 * Skills page
 */
export default component$(() => {
  const { lang } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const skills = useSkills();
  const langConfig = useSiteLanguageConfig();
  const { items: skillsState, loading } = useLocaleAwareList<Skill>(
    skills,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST).then((res: any) => {
        const body = res?.data ?? res;
        if (Array.isArray(body)) return body as Skill[];
        if (body && Array.isArray(body.data)) return body.data as Skill[];
        return [];
      });
    }),
  );
  const createAction = useCreateSkill();
  const updateAction = useUpdateSkill();
  const deleteAction = useDeleteSkill();
  const bulkDeleteAction = useBulkDeleteSkills();

  const showForm = useSignal(false);
  const editingId = useSignal<number | null>(null);
  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const filteredSkills = useComputed$(() => {
    const list = skillsState.value || [];
    const query = (searchQuery.value || '').trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (s: any) =>
        String(s.name ?? '').toLowerCase().includes(query) ||
        String(s.slug ?? '').toLowerCase().includes(query) ||
        String(s.description ?? '').toLowerCase().includes(query) ||
        String(s.iconHint ?? s.icon_hint ?? '').toLowerCase().includes(query)
    );
  });

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    icon_hint: '',
  });
  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.default_locale);
  const canonicalName = useSignal('');
  const canonicalDescription = useSignal('');
  const translationsJson = useSignal('[]');

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const resetForm = $(() => {
    formData.value = {
      name: '',
      slug: '',
      description: '',
      icon_hint: '',
    };
    editingId.value = null;
    showForm.value = false;
    contentLocaleDraft.value = '';
    canonicalName.value = '';
    canonicalDescription.value = '';
    translationsJson.value = '[]';
  });

  // Pre-compute translation strings to avoid serialization issues
  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    updatedText: String(translateApp(lang, 'common.updated')),
    createdText: String(translateApp(lang, 'common.created')),
  };

  const editSkill = $((skill: Skill) => {
    canonicalName.value = (skill as any).name ?? '';
    canonicalDescription.value = (skill as any).description ?? '';
    formData.value = {
      name: skill.name,
      slug: skill.slug,
      description: skill.description || '',
      icon_hint: (skill as any).iconHint || (skill as any).icon_hint || '',
    };
    editingId.value = skill.id;
    showForm.value = true;
    contentLocaleDraft.value =
      (skill as any).content_locale != null && String((skill as any).content_locale).trim() !== ''
        ? String((skill as any).content_locale).trim()
        : '';
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = (skill as any).translations?.find((x: any) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return { locale: l.code, name: row?.name ?? '', description: row?.description ?? '' };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => skillsState.value);
    track(() => editingId.value);
    if (!editingId.value) return;
    const current = (skillsState.value || []).find((s) => s.id === editingId.value);
    if (!current) return;
    const m = mergeSkillFieldsForUiLocale(
      current,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    formData.value = { ...formData.value, name: m.name, description: m.description };
  });

  const handleSave = $(async () => {
    const successTitle = saveTranslations.successTitle;
    const updatedText = saveTranslations.updatedText;
    const createdText = saveTranslations.createdText;
    
    if (editingId.value) {
      const response = await updateAction.submit({
        id: String(editingId.value),
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
        ...formData.value,
      });
      if (response.value?.failed) {
        await showError((response.value as any).message || 'Failed to update skill');
      } else {
        await success(successTitle, { text: updatedText });
        // keep edit form open after update (do not exit to list)
        const updated = (response.value as any)?.skill as Skill | undefined;
        if (updated) {
          skillsState.value = skillsState.value.map((s) => (s.id === updated.id ? updated : s));
        } else {
          const id = editingId.value;
          skillsState.value = skillsState.value.map((s) =>
            s.id === id
              ? ({
                  ...s,
                  name: formData.value.name,
                  slug: formData.value.slug || (s as any).slug,
                  description: formData.value.description || (s as any).description,
                  iconHint: formData.value.icon_hint || (s as any).iconHint,
                } as any)
              : s,
          );
        }
      }
    } else {
      const response2 = await createAction.submit({
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
        ...formData.value,
      });
      if (response2.value?.failed) {
        const errorMsg = (response2.value as any).message || (response2.value as any).error || 'Failed to create skill';
        await showError(errorMsg);
      } else {
        await success(successTitle, { text: createdText });
        resetForm();
        // keep user on page; update list in-place
        const created = (response2.value as any)?.skill as Skill | undefined;
        if (created) {
          skillsState.value = [created, ...skillsState.value];
        }
      }
    }
  });

  // Pre-compute delete translations
  const deleteTranslations = {
    confirmText: String(translateApp(lang, 'skills.deleteConfirm')),
    title: String(translateApp(lang, 'common.delete')),
    successTitle: String(translateApp(lang, 'common.success')),
    deletedText: String(translateApp(lang, 'common.deleted')),
  };

  const handleDelete = $(async (skill: Skill) => {
    const deleteConfirmText = deleteTranslations.confirmText;
    const deleteTitle = deleteTranslations.title;
    const successTitle = deleteTranslations.successTitle;
    const deletedText = deleteTranslations.deletedText;
    
    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(skill.id) });
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to delete skill');
    } else {
      await success(successTitle, { text: deletedText });
      skillsState.value = skillsState.value.filter((s) => s.id !== skill.id);
      selectedItems.value = selectedItems.value.filter((id) => id !== String(skill.id));
    }
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const deleteConfirmText = deleteTranslations.confirmText;
    const deleteTitle = deleteTranslations.title;
    const successTitle = deleteTranslations.successTitle;
    const deletedText = deleteTranslations.deletedText;

    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await bulkDeleteAction.submit({ ids: selectedItems.value });
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to delete skills');
    } else {
      await success(successTitle, { text: deletedText });
      const toDelete = new Set(selectedItems.value.map(String));
      skillsState.value = skillsState.value.filter((s) => !toDelete.has(String(s.id)));
      selectedItems.value = [];
    }
  });

  const toggleSelect = $((id: string) => {
    const newSelected = [...selectedItems.value];
    const index = newSelected.indexOf(id);
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(id);
    }
    selectedItems.value = newSelected;
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  return (
    <>
      <PageHeader
        title={translateApp(lang, 'skills.title')}
        description={translateApp(lang, 'skills.subtitle')}
      >
        <div class="flex gap-2">
            {selectedItems.value.length > 0 && (
              <>
                <button
                  onClick$={handleBulkDelete}
                  class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                >
                  {translateApp(lang, 'common.delete')} ({selectedItems.value.length})
                </button>
                <button
                  onClick$={deselectAll}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {translateApp(lang, 'common.cancel')}
                </button>
              </>
            )}
            {!showForm.value ? (
              <button
                onClick$={() => (showForm.value = true)}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'skills.addNew')}
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
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        {showForm.value && (
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId.value ? translateApp(lang, 'skills.edit') : translateApp(lang, 'skills.addNew')}
            </h2>
            <div class="space-y-4">
              {!editingId.value ? (
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
              ) : null}
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
                <label
                  for="name"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {translateApp(lang, 'skills.name')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.value.name}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  required
                />
              </div>
              <div>
                <label
                  for="slug"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {translateApp(lang, 'skills.slug')}
                </label>
                <input
                  id="slug"
                  type="text"
                  value={formData.value.slug}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div>
                <label
                  for="icon_hint"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {translateApp(lang, 'skills.iconHint')}
                </label>
                <input
                  id="icon_hint"
                  type="text"
                  value={formData.value.icon_hint}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, icon_hint: (e.target as HTMLInputElement).value };
                  }}
                  placeholder="e.g., ⚡, 🚀, 💻"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div>
                <label
                  for="description"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {translateApp(lang, 'skills.description')}
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.value.description}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, description: (e.target as HTMLTextAreaElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div class="flex gap-2">
                <button
                  onClick$={handleSave}
                  class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                >
                  {editingId.value ? translateApp(lang, 'common.update') : translateApp(lang, 'common.add')}
                </button>
                <button
                  onClick$={resetForm}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {translateApp(lang, 'common.cancel')}
                </button>
              </div>
              </EditingLocaleFieldsShell>
            </div>
          </div>
        )}

        {/* List */}
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(lang, 'skills.list')}
          </h2>

          {/* Search */}
          <div class="mb-4">
            <input
              type="text"
              value={searchQuery.value}
              onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
              placeholder={translateApp(lang, 'common.search')}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          {loading.value ? (
            <div class="py-6 text-center text-gray-500 dark:text-gray-400">{translateApp(lang, 'common.loading')}</div>
          ) : filteredSkills.value.length === 0 ? (
            <EmptyState title={translateApp(lang, 'skills.noSkills')} />
          ) : (
            <ul class="space-y-2">
              {filteredSkills.value.map((skill) => (
                <li
                  key={skill.id}
                  class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.value.includes(String(skill.id))}
                      onChange$={() => toggleSelect(String(skill.id))}
                      class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div class="flex items-center gap-3">
                      {((skill as any).iconHint || (skill as any).icon_hint) && (
                        <span class="text-xl">{(skill as any).iconHint || (skill as any).icon_hint}</span>
                      )}
                      <div>
                        <p class="font-medium text-gray-900 dark:text-gray-100">{skill.name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {translateApp(lang, 'skills.slug')}: {skill.slug}
                        </p>
                        {skill.description && (
                          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {skill.description}
                          </p>
                        )}
                        <div class="mt-1 flex flex-wrap gap-1">
                          <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                            {translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}: {(skill as any).content_locale || langConfig.value.default_locale}
                          </span>
                          {Array.isArray((skill as any).translations) && (skill as any).translations.length > 0 ? (
                            <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                              {translateApp(lang, 'contentTranslations.addTranslations')}: {(skill as any).translations.map((r: any) => r?.locale).filter(Boolean).join(', ')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {translateApp(lang, 'skills.projectsCount', { count: skill.projectsCount ?? 0 })}
                    </span>
                    <button
                      onClick$={() => editSkill(skill)}
                      class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      {translateApp(lang, 'common.edit')}
                    </button>
                    <button
                      onClick$={() => handleDelete(skill)}
                      class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {translateApp(lang, 'common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Skills - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage skills',
    },
  ],
};
