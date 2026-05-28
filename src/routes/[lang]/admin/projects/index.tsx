import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, useNavigate, Link, zod$, z } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { AdminContentImportExportButtons } from '../../../../components/admin/AdminContentImportExportButtons';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient } from '../../../../lib/api/client';
import { adminApiClient } from '../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { adminProjectEditHref, useAppRoutes } from '../../../../lib/constants/routes';
import type { Project } from '../../../../types/project';
import { useSiteLanguageConfig } from '../layout';
import { primaryLocaleForContent } from '../../../../lib/content-display-locale';
import { useLocaleAwareList } from '../../../../lib/hooks/useLocaleAwareList';

/**
 * Load projects data
 */
export const useProjects = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const apiClient = adminApiClient(cookie, request, params.lang);
    const response = await apiClient.get<any>(API_ENDPOINTS.PROJECTS.LIST);
    
    // Handle Laravel paginated response structure
    // Backend returns: ProjectResource::collection($paginator)
    // Which gives: { data: [...projects...], links: {...}, meta: {...} }
    // API client now returns: { success: true, data: { data: [...], links: {...}, meta: {...} } }
    // So we need to extract the 'data' array from the paginated response
    let projects: Project[] = [];
    
    if (response?.data) {
      // Case 1: response.data is already an array (direct array response, not paginated)
      if (Array.isArray(response.data)) {
        projects = response.data as Project[];
      }
      // Case 2: response.data is a paginated response object with 'data', 'links', 'meta' properties
      else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        const paginatedData = response.data.data;
        if (Array.isArray(paginatedData)) {
          projects = paginatedData as Project[];
        }
      }
    }
    
    return projects;
  } catch (error: any) {
    console.error('Failed to load projects:', error);
    return [];
  }
});

/**
 * Delete project action
 */
export const useDeleteProject = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete project' });
  }
}, zod$({ id: z.string() }));

/**
 * Bulk delete projects action
 */
export const useBulkDeleteProjects = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    const ids = Array.isArray(data.ids) ? data.ids : [data.ids];
    await apiClient.post(API_ENDPOINTS.PROJECTS.BULK_DELETE, { ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete projects' });
  }
}, zod$({ ids: z.union([z.string(), z.array(z.string())]) }));

/**
 * Projects list page - Matching Vue Dashboard
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const projectsLoader = useProjects();
  const langConfig = useSiteLanguageConfig();
  const deleteAction = useDeleteProject();
  const bulkDeleteAction = useBulkDeleteProjects();

  const { items: projects, loading, refetch } = useLocaleAwareList<Project>(
    projectsLoader,
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get<any>(API_ENDPOINTS.PROJECTS.LIST).then((response) => {
        let out: Project[] = [];
        if (response?.data) {
          if (Array.isArray(response.data)) {
            out = response.data as Project[];
          } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const paginatedData = (response.data as any).data;
            if (Array.isArray(paginatedData)) {
              out = paginatedData as Project[];
            }
          }
        }
        return out;
      });
    }),
  );
  const selectedItems = useSignal<Set<string | number>>(new Set());
  const exportImportBusy = useSignal(false);

  // Pre-compute translation strings to avoid serialization issues
  const translations = {
    deleteConfirm: translateApp(lang, 'projects.deleteConfirm'),
    deleteTitle: translateApp(lang, 'common.delete'),
    successTitle: translateApp(lang, 'common.success'),
    deletedText: translateApp(lang, 'common.deleted'),
    failedToDelete: 'Failed to delete project',
    failedToDeleteMultiple: 'Failed to delete projects',
  };

  const deleteProject = $(async (id: string | number) => {
    const result = await confirm(translations.deleteConfirm, {
      icon: 'warning',
      title: translations.deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(id) });
    if (response.value?.failed) {
      await showError((response.value as any).message || translations.failedToDelete);
    } else {
      await success(translations.successTitle, { text: translations.deletedText });
      projects.value = projects.value.filter((p) => p.id !== id);
      selectedItems.value.delete(id);
    }
  });

  const toggleSelect = $((id: string | number) => {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id);
    } else {
      selectedItems.value.add(id);
    }
    selectedItems.value = new Set(selectedItems.value);
  });

  const selectAll = $(() => {
    projects.value.forEach((p) => selectedItems.value.add(p.id));
    selectedItems.value = new Set(selectedItems.value);
  });

  const deselectAll = $(() => {
    selectedItems.value.clear();
    selectedItems.value = new Set();
  });

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (proj: Project): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      (proj as any).content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (proj: Project): string => {
    const rows = (proj as any).translations as Array<{ locale?: string | null }> | undefined;
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

  const bulkDelete = $(async () => {
    if (selectedItems.value.size === 0) return;

    const result = await confirm(translations.deleteConfirm, {
      icon: 'warning',
      title: translations.deleteTitle,
    });
    if (!result.isConfirmed) return;

    const ids = Array.from(selectedItems.value);
    const response = await bulkDeleteAction.submit({ ids: ids.map(String) });
    if (response.value?.failed) {
      await showError((response.value as any).message || translations.failedToDeleteMultiple);
    } else {
      await success(translations.successTitle, { text: translations.deletedText });
      projects.value = projects.value.filter((p) => !selectedItems.value.has(p.id));
      selectedItems.value.clear();
      selectedItems.value = new Set();
    }
  });

  const goToEdit = $((id: string | number) => {
    navigate(adminProjectEditHref(lang, id));
  });

  const refetchList = $((locale: string) => refetch(locale));

  return (
    <>
      {/* Component: ProjectsPage */}
      <div>
        <PageHeader
          title={translateApp(lang, 'projects.title')}
          description={translateApp(lang, 'projects.subtitle')}
        >
          <div class="flex flex-wrap gap-2">
            <AdminContentImportExportButtons
              lang={lang}
              exportEndpoint={API_ENDPOINTS.PROJECTS.EXPORT}
              importEndpoint={API_ENDPOINTS.PROJECTS.IMPORT}
              filePrefix="projects"
              selectedIds={selectedItems}
              busy={exportImportBusy}
              onRefetch$={refetchList}
            />
            <Link
              href={R.ADMIN.PROJECTS_NEW}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              {translateApp(lang, 'projects.addNew')}
            </Link>
            <button
              onClick$={selectAll}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.selectAll') || 'Select all'}
            </button>
          </div>
        </PageHeader>

        {/* Projects List */}
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">{translateApp(lang, 'projects.list')}</h2>
              {selectedItems.value.size > 0 && (
                <div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
                  <span>{selectedItems.value.size} {translateApp(lang, 'common.selected') || 'selected'}</span>
                  <button
                    onClick$={bulkDelete}
                    class="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                  >
                    {translateApp(lang, 'common.delete')}
                  </button>
                  <button
                    onClick$={selectAll}
                    class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {translateApp(lang, 'common.selectAll') || 'Select all'}
                  </button>
                  <button
                    onClick$={deselectAll}
                    class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {translateApp(lang, 'common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>
          {loading.value ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <LoadingSpinner />
            </div>
          ) : projects.value.length === 0 ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">{translateApp(lang, 'projects.noProjects')}</div>
          ) : (
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              {projects.value.map((proj) => (
                <div
                  key={proj.id}
                  class="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.value.has(proj.id)}
                        onChange$={() => toggleSelect(proj.id)}
                        class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{proj.title}</h3>
                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <span class="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-900/40">
                            <span class="font-semibold">{translateApp(lang, 'contentTranslations.contentPrimaryLanguage') || 'Main'}:</span>{' '}
                            {mainLocaleLabel(proj)}
                          </span>
                          <span class="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-900/40">
                            <span class="font-semibold">{translateApp(lang, 'contentTranslations.sectionTitle') || 'Translations'}:</span>{' '}
                            {translationsLabel(proj)}
                          </span>
                        </div>
                        {proj.categories && Array.isArray(proj.categories) && proj.categories.length > 0 && (
                          <div class="text-sm text-gray-600 dark:text-gray-300">
                            <span class="font-medium">{translateApp(lang, 'projects.categories')}:</span>
                            {proj.categories.map((c: any) => c.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        onClick$={() => goToEdit(proj.id)}
                        class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                      >
                        {translateApp(lang, 'common.edit')}
                      </button>
                      <button
                        onClick$={() => deleteProject(proj.id)}
                        class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {translateApp(lang, 'common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Projects - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage company projects',
    },
  ],
};
