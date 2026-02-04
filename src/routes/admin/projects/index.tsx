import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, useNavigate, Link, zod$, z } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { ROUTES } from '../../../lib/constants/routes';
import type { Project } from '../../../types/project';

/**
 * Load projects data
 */
export const useProjects = routeLoader$(async ({ cookie, request }) => {
  try {
    // Get cookies from request headers for server-side authentication
    // The token is stored in auth_session cookie and will be extracted by the API client
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
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
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const projectsLoader = useProjects();
  const deleteAction = useDeleteProject();
  const bulkDeleteAction = useBulkDeleteProjects();

  const projects = useSignal(projectsLoader.value);
  const loading = useSignal(false);
  const selectedItems = useSignal<Set<string | number>>(new Set());

  // Pre-compute translation strings to avoid serialization issues
  const translations = {
    deleteConfirm: t('projects.deleteConfirm'),
    deleteTitle: t('common.delete'),
    successTitle: t('common.success'),
    deletedText: t('common.deleted'),
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
    navigate(ROUTES.ADMIN.PROJECTS_EDIT(id));
  });

  return (
    <>
      {/* Component: ProjectsPage */}
      <div>
        <PageHeader
          title={t('projects.title')}
          description={t('projects.subtitle')}
        >
          <div class="flex gap-2">
            <Link
              href={ROUTES.ADMIN.PROJECTS_NEW}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              {t('projects.addNew')}
            </Link>
            <button
              onClick$={selectAll}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.selectAll') || 'Select all'}
            </button>
          </div>
        </PageHeader>

        {/* Projects List */}
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">{t('projects.list')}</h2>
              {selectedItems.value.size > 0 && (
                <div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
                  <span>{selectedItems.value.size} {t('common.selected') || 'selected'}</span>
                  <button
                    onClick$={bulkDelete}
                    class="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                  >
                    {t('common.delete')}
                  </button>
                  <button
                    onClick$={selectAll}
                    class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {t('common.selectAll') || 'Select all'}
                  </button>
                  <button
                    onClick$={deselectAll}
                    class="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {t('common.cancel')}
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
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">{t('projects.noProjects')}</div>
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
                        {proj.categories && Array.isArray(proj.categories) && proj.categories.length > 0 && (
                          <div class="text-sm text-gray-600 dark:text-gray-300">
                            <span class="font-medium">{t('projects.categories')}:</span>
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
                        {t('common.edit')}
                      </button>
                      <button
                        onClick$={() => deleteProject(proj.id)}
                        class="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {t('common.delete')}
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
