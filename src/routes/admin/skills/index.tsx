import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, zod$, z, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import type { Skill, SkillCreateInput, SkillUpdateInput } from '../../../types';

/**
 * Skill schema
 */
const skillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon_hint: z.string().optional(),
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
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const skills = useSkills();
  const createAction = useCreateSkill();
  const updateAction = useUpdateSkill();
  const deleteAction = useDeleteSkill();
  const bulkDeleteAction = useBulkDeleteSkills();

  const showForm = useSignal(false);
  const editingId = useSignal<number | null>(null);
  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const filteredSkills = useSignal(skills.value);

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    icon_hint: '',
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
    if (!value.trim()) {
      filteredSkills.value = skills.value;
    } else {
      const query = value.toLowerCase();
      filteredSkills.value = skills.value.filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.slug?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.iconHint?.toLowerCase().includes(query)
      );
    }
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
  });

  // Pre-compute translation strings to avoid serialization issues
  const saveTranslations = {
    successTitle: String(t('common.success')),
    updatedText: String(t('common.updated')),
    createdText: String(t('common.created')),
  };

  const editSkill = $((skill: Skill) => {
    formData.value = {
      name: skill.name,
      slug: skill.slug,
      description: skill.description || '',
      icon_hint: skill.iconHint || '',
    };
    editingId.value = skill.id;
    showForm.value = true;
  });

  const handleSave = $(async () => {
    const successTitle = saveTranslations.successTitle;
    const updatedText = saveTranslations.updatedText;
    const createdText = saveTranslations.createdText;
    
    if (editingId.value) {
      const response = await updateAction.submit({
        id: String(editingId.value),
        ...formData.value,
      });
      if (response.value?.failed) {
        await showError((response.value as any).message || 'Failed to update skill');
      } else {
        await success(successTitle, { text: updatedText });
        resetForm();
        navigate(window.location.pathname);
      }
    } else {
      const response = await createAction.submit(formData.value);
      if (response.value?.failed) {
        const errorMsg = (response.value as any).message || (response.value as any).error || 'Failed to create skill';
        await showError(errorMsg);
      } else {
        await success(successTitle, { text: createdText });
        resetForm();
        navigate(window.location.pathname);
      }
    }
  });

  // Pre-compute delete translations
  const deleteTranslations = {
    confirmText: String(t('skills.deleteConfirm')),
    title: String(t('common.delete')),
    successTitle: String(t('common.success')),
    deletedText: String(t('common.deleted')),
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
      navigate(window.location.pathname);
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
      selectedItems.value = [];
      navigate(window.location.pathname);
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
        title={t('skills.title')}
        description={t('skills.subtitle')}
      >
        <div class="flex gap-2">
            {selectedItems.value.length > 0 && (
              <>
                <button
                  onClick$={handleBulkDelete}
                  class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                >
                  {t('common.delete')} ({selectedItems.value.length})
                </button>
                <button
                  onClick$={deselectAll}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </>
            )}
            {!showForm.value ? (
              <button
                onClick$={() => (showForm.value = true)}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {t('skills.addNew')}
              </button>
            ) : (
              <button
                onClick$={resetForm}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        {showForm.value && (
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId.value ? t('skills.edit') : t('skills.addNew')}
            </h2>
            <div class="space-y-4">
              <div>
                <label
                  for="name"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('skills.name')} *
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
                  {t('skills.slug')}
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
                  {t('skills.iconHint')}
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
                  {t('skills.description')}
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
                  {editingId.value ? t('common.update') : t('common.add')}
                </button>
                <button
                  onClick$={resetForm}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('skills.list')}
          </h2>

          {/* Search */}
          <div class="mb-4">
            <input
              type="text"
              value={searchQuery.value}
              onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
              placeholder={t('common.search')}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          {filteredSkills.value.length === 0 ? (
            <EmptyState title={t('skills.noSkills')} />
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
                      {skill.iconHint && (
                        <span class="text-xl">{skill.iconHint}</span>
                      )}
                      <div>
                        <p class="font-medium text-gray-900 dark:text-gray-100">{skill.name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {t('skills.slug')}: {skill.slug}
                        </p>
                        {skill.description && (
                          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {t('skills.projectsCount', { count: skill.projectsCount ?? 0 })}
                    </span>
                    <button
                      onClick$={() => editSkill(skill)}
                      class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick$={() => handleDelete(skill)}
                      class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('common.delete')}
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
