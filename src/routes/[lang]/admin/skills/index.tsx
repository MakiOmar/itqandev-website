import { component$, useSignal, $, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { AdminContentImportExportButtons } from '../../../../components/admin/AdminContentImportExportButtons';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../lib/api/client';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { adminSkillEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import type { Skill } from '../../../../types';
import { useSiteLanguageConfig } from '../layout';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';
import { primaryLocaleForContent } from '../../../../lib/content-display-locale';
import { useDeleteSkill, useBulkDeleteSkills } from '../../../../lib/admin/skill-actions';
import { looksLikeRouteActionResult, submitRouteActionFormData } from '../../../../lib/admin/route-action-form-submit';

function extractSkillsList(response: unknown): Skill[] {
  const body = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(body)) {
    return body as Skill[];
  }
  if (body && typeof body === 'object' && 'data' in (body as object) && Array.isArray((body as { data: unknown }).data)) {
    return (body as { data: Skill[] }).data;
  }
  return [];
}

/**
 * Load skills (admin list)
 */
export const useSkills = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST);
    return extractSkillsList(response);
  } catch (error: unknown) {
    console.error('Failed to load skills:', error);
    return [];
  }
});

/**
 * Skills list only — create/edit live on /skills/new and /skills/:id
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();

  const skillsLoader = useSkills();
  const langConfig = useSiteLanguageConfig();

  const { items: skillsState, loading, refetch } = useLocaleAwareList<Skill>(
    skillsLoader,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST).then((res) => extractSkillsList(res));
    }),
  );

  const deleteAction = useDeleteSkill();
  const bulkDeleteAction = useBulkDeleteSkills();

  const translations = {
    success: translateApp(lang, 'common.success'),
    deleted: translateApp(lang, 'common.deleted'),
    delete: translateApp(lang, 'common.delete'),
    deleteConfirm: translateApp(lang, 'skills.deleteConfirm'),
  };

  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');
  const exportImportBusy = useSignal(false);

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (skill: Skill): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      skill.content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (skill: Skill): string => {
    const rows = skill.translations;
    const locales = Array.isArray(rows)
      ? Array.from(
          new Set(
            rows
              .map((r) => String(r?.locale ?? '').trim().toLowerCase())
              .filter((x) => x.length > 0),
          ),
        )
      : [];
    if (locales.length === 0) {
      return translateApp(lang, 'contentTranslations.noSecondaryLanguages') || '—';
    }
    const labels = locales.map((code) => `${languageLabelByCode.get(code) || code} (${code})`);
    return `${locales.length}: ${labels.join(', ')}`;
  };

  const filteredSkills = useComputed$(() => {
    const list = skillsState.value || [];
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        String(s.name ?? '').toLowerCase().includes(q) ||
        String(s.slug ?? '').toLowerCase().includes(q) ||
        String(s.description ?? '').toLowerCase().includes(q) ||
        String(s.iconHint ?? '').toLowerCase().includes(q),
    );
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const handleDelete = $(async (skill: Skill) => {
    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    const val = await submitRouteActionFormData(deleteAction, { id: String(skill.id) }, looksLikeRouteActionResult);
    if (val?.failed) {
      await showError(val.message || 'Failed to delete skill');
      return;
    }

    await success(translations.success, { text: translations.deleted });
    skillsState.value = skillsState.value.filter((s) => s.id !== skill.id);
    selectedItems.value = selectedItems.value.filter((id) => id !== String(skill.id));
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    const val = await submitRouteActionFormData(
      bulkDeleteAction,
      { ids: selectedItems.value },
      looksLikeRouteActionResult,
    );
    if (val?.failed) {
      await showError(val.message || 'Failed to delete skills');
      return;
    }

    await success(translations.success, { text: translations.deleted });

    const toDelete = new Set(selectedItems.value);
    skillsState.value = skillsState.value.filter((s) => !toDelete.has(String(s.id)));
    selectedItems.value = [];
  });

  const toggleSelect = $((id: string) => {
    const next = [...selectedItems.value];
    const index = next.indexOf(id);
    if (index > -1) next.splice(index, 1);
    else next.push(id);
    selectedItems.value = next;
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  const refetchList = $((locale: string) => refetch(locale));

  return (
    <>
      <PageHeader title={translateApp(lang, 'skills.title')} description={translateApp(lang, 'skills.subtitle')}>
        <div class="flex flex-wrap gap-2">
          <AdminContentImportExportButtons
            lang={lang}
            exportEndpoint={API_ENDPOINTS.SKILLS.EXPORT}
            importEndpoint={API_ENDPOINTS.SKILLS.IMPORT}
            filePrefix="skills"
            selectedIds={selectedItems}
            busy={exportImportBusy}
            onRefetch$={refetchList}
          />

          {selectedItems.value.length > 0 && (
            <>
              <button
                type="button"
                onClick$={handleBulkDelete}
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                {translateApp(lang, 'common.delete')} ({selectedItems.value.length})
              </button>
              <button
                type="button"
                onClick$={deselectAll}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.cancel')}
              </button>
            </>
          )}

          <Link
            href={R.ADMIN.SKILLS_NEW}
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            {translateApp(lang, 'skills.addNew')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'skills.list')}</h2>

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
                    {skill.iconHint && <span class="text-xl">{skill.iconHint}</span>}
                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100">{skill.name}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {translateApp(lang, 'skills.slug')}: {skill.slug}
                      </p>
                      {skill.description && (
                        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{skill.description}</p>
                      )}
                      <div class="mt-1 flex flex-wrap gap-1">
                        <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                          {translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}: {mainLocaleLabel(skill)}
                        </span>
                        <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                          {translateApp(lang, 'contentTranslations.addTranslations')}: {translationsLabel(skill)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {translateApp(lang, 'skills.projectsCount', { count: skill.projectsCount ?? 0 })}
                  </span>

                  <Link
                    href={adminSkillEditHref(lang, skill.id)}
                    class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                  >
                    {translateApp(lang, 'common.edit')}
                  </Link>

                  <button
                    type="button"
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
    </>
  );
});

export const head: DocumentHead = {
  title: 'Skills - Dashboard',
  meta: [{ name: 'description', content: 'Manage skills' }],
};
