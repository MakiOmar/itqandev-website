import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, zod$, z, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import type { Testimonial, TestimonialCreateInput, TestimonialUpdateInput, Project } from '../../../types';

/**
 * Testimonial schema
 */
const testimonialSchema = z.object({
  project_id: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  client_role: z.string().optional(),
  company: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  content: z.string().min(1, 'Content is required'),
  video_url: z.string().url().optional().or(z.literal('')),
  approved: z.union([z.boolean(), z.string()]).optional(),
});

/**
 * Load testimonials and projects
 */
export const useTestimonialsAndProjects = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const [testimonialsRes, projectsRes] = await Promise.all([
      apiClient.get<Testimonial[]>(API_ENDPOINTS.TESTIMONIALS.LIST).catch(() => ({ data: [] })),
      apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS.LIST),
    ]);

    // Handle paginated responses
    const extractData = <T,>(response: any): T[] => {
      if (!response?.data) return [];
      if (Array.isArray(response.data)) return response.data as T[];
      if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data as T[];
      }
      return [];
    };

    return {
      testimonials: extractData<Testimonial>(testimonialsRes),
      projects: extractData<Project>(projectsRes),
    };
  } catch (error: any) {
    console.error('Failed to load data:', error);
    return { testimonials: [], projects: [] };
  }
});

/**
 * Create testimonial action
 */
export const useCreateTestimonial = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: TestimonialCreateInput = {
      projectId: data.project_id ? Number(data.project_id) : undefined,
      clientName: data.client_name,
      clientRole: data.client_role || undefined,
      company: data.company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : (data.rating || 5),
      content: data.content,
      videoUrl: data.video_url || undefined,
      approved: data.approved === true || data.approved === '1' || data.approved === 'on',
    };
    const response = await apiClient.post<Testimonial>(API_ENDPOINTS.TESTIMONIALS.CREATE, payload);
    return { success: true, testimonial: response?.data ?? response };
  },
  zod$(testimonialSchema)
);

/**
 * Update testimonial action
 */
export const useUpdateTestimonial = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: TestimonialUpdateInput = {
      id: Number(data.id),
      projectId: data.project_id ? Number(data.project_id) : undefined,
      clientName: data.client_name,
      clientRole: data.client_role || undefined,
      company: data.company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : (data.rating || 5),
      content: data.content,
      videoUrl: data.video_url || undefined,
      approved: data.approved === true || data.approved === '1' || data.approved === 'on',
    };
    await apiClient.put(API_ENDPOINTS.TESTIMONIALS.UPDATE(String(data.id)), payload);
    return { success: true };
  },
  zod$(testimonialSchema.extend({ id: z.string() }))
);

/**
 * Delete testimonial action
 */
export const useDeleteTestimonial = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.delete(API_ENDPOINTS.TESTIMONIALS.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete testimonial' });
  }
});

/**
 * Bulk delete testimonials action
 */
export const useBulkDeleteTestimonials = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.post(API_ENDPOINTS.TESTIMONIALS.BULK_DELETE, { ids: data.ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete testimonials' });
  }
});

/**
 * Testimonials page
 */
export default component$(() => {
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const data = useTestimonialsAndProjects();
  const createAction = useCreateTestimonial();
  const updateAction = useUpdateTestimonial();
  const deleteAction = useDeleteTestimonial();
  const bulkDeleteAction = useBulkDeleteTestimonials();

  const showForm = useSignal(false);
  const editingId = useSignal<number | null>(null);
  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const filteredTestimonials = useSignal(data.value.testimonials);

  const formData = useSignal({
    project_id: '',
    client_name: '',
    client_role: '',
    company: '',
    rating: 5,
    content: '',
    video_url: '',
    approved: false,
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
    if (!value.trim()) {
      filteredTestimonials.value = data.value.testimonials;
    } else {
      const query = value.toLowerCase();
      filteredTestimonials.value = data.value.testimonials.filter(
        (test) =>
          test.clientName?.toLowerCase().includes(query) ||
          test.clientRole?.toLowerCase().includes(query) ||
          test.company?.toLowerCase().includes(query) ||
          test.content?.toLowerCase().includes(query)
      );
    }
  });

  const resetForm = $(() => {
    formData.value = {
      project_id: '',
      client_name: '',
      client_role: '',
      company: '',
      rating: 5,
      content: '',
      video_url: '',
      approved: false,
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

  const editTestimonial = $((testimonial: Testimonial) => {
    formData.value = {
      project_id: testimonial.projectId ? String(testimonial.projectId) : '',
      client_name: testimonial.clientName,
      client_role: testimonial.clientRole || '',
      company: testimonial.company || '',
      rating: testimonial.rating || 5,
      content: testimonial.content,
      video_url: testimonial.videoUrl || '',
      approved: testimonial.approved || false,
    };
    editingId.value = testimonial.id;
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
        const errorMsg = (response.value as any).message || (response.value as any).error || 'Failed to update testimonial';
        await showError(errorMsg);
      } else {
        await success(successTitle, { text: updatedText });
        resetForm();
        navigate(window.location.pathname);
      }
    } else {
      const response = await createAction.submit(formData.value);
      if (response.value?.failed) {
        const errorMsg = (response.value as any).message || (response.value as any).error || 'Failed to create testimonial';
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
    confirmText: String(t('testimonials.deleteConfirm')),
    title: String(t('common.delete')),
    successTitle: String(t('common.success')),
    deletedText: String(t('common.deleted')),
  };

  const handleDelete = $(async (testimonial: Testimonial) => {
    const deleteConfirmText = deleteTranslations.confirmText;
    const deleteTitle = deleteTranslations.title;
    const successTitle = deleteTranslations.successTitle;
    const deletedText = deleteTranslations.deletedText;
    
    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(testimonial.id) });
    if (response.value?.failed) {
      await showError((response.value as any).message || 'Failed to delete testimonial');
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
      await showError((response.value as any).message || 'Failed to delete testimonials');
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
        title={t('testimonials.title')}
        description={t('testimonials.subtitle')}
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
              {t('testimonials.addNew')}
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
              {editingId.value ? t('testimonials.edit') : t('testimonials.addNew')}
            </h2>
            <div class="space-y-4">
              <div>
                <label
                  for="project_id"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.project')}
                </label>
                <select
                  id="project_id"
                  value={formData.value.project_id}
                  onChange$={(e) => {
                    formData.value = { ...formData.value, project_id: (e.target as HTMLSelectElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  <option value="">{t('testimonials.noProject')}</option>
                  {data.value.projects.map((proj) => (
                    <option key={proj.id} value={String(proj.id)}>
                      {proj.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  for="client_name"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.clientName')} *
                </label>
                <input
                  id="client_name"
                  type="text"
                  value={formData.value.client_name}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, client_name: (e.target as HTMLInputElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="client_role"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {t('testimonials.clientRole')}
                  </label>
                  <input
                    id="client_role"
                    type="text"
                    value={formData.value.client_role}
                    onInput$={(e) => {
                      formData.value = { ...formData.value, client_role: (e.target as HTMLInputElement).value };
                    }}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label
                    for="company"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {t('testimonials.company')}
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={formData.value.company}
                    onInput$={(e) => {
                      formData.value = { ...formData.value, company: (e.target as HTMLInputElement).value };
                    }}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </div>
              <div>
                <label
                  for="rating"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.rating')}
                </label>
                <select
                  id="rating"
                  value={formData.value.rating}
                  onChange$={(e) => {
                    formData.value = { ...formData.value, rating: Number((e.target as HTMLSelectElement).value) };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  <option value={5}>5 ⭐⭐⭐⭐⭐</option>
                  <option value={4}>4 ⭐⭐⭐⭐</option>
                  <option value={3}>3 ⭐⭐⭐</option>
                  <option value={2}>2 ⭐⭐</option>
                  <option value={1}>1 ⭐</option>
                </select>
              </div>
              <div>
                <label
                  for="content"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.content')} *
                </label>
                <textarea
                  id="content"
                  rows={4}
                  value={formData.value.content}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, content: (e.target as HTMLTextAreaElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  required
                />
              </div>
              <div>
                <label
                  for="video_url"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.videoUrl')}
                </label>
                <input
                  id="video_url"
                  type="url"
                  value={formData.value.video_url}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, video_url: (e.target as HTMLInputElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  id="approved"
                  type="checkbox"
                  checked={formData.value.approved}
                  onChange$={(e) => {
                    formData.value = { ...formData.value, approved: (e.target as HTMLInputElement).checked };
                  }}
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label
                  for="approved"
                  class="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('testimonials.approved')}
                </label>
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
            {t('testimonials.list')}
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

          {filteredTestimonials.value.length === 0 ? (
            <EmptyState title={t('testimonials.noTestimonials')} />
          ) : (
            <ul class="space-y-4">
              {filteredTestimonials.value.map((testimonial) => (
                <li
                  key={testimonial.id}
                  class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.value.includes(String(testimonial.id))}
                        onChange$={() => toggleSelect(String(testimonial.id))}
                        class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                            {testimonial.clientName}
                          </h3>
                          <span class="text-sm text-gray-500 dark:text-gray-400">
                            {'⭐'.repeat(testimonial.rating || 5)}
                          </span>
                          {testimonial.approved && (
                            <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              {t('testimonials.approvedLabel')}
                            </span>
                          )}
                        </div>
                        {(testimonial.clientRole || testimonial.company) && (
                          <p class="text-sm text-gray-600 dark:text-gray-300">
                            {[testimonial.clientRole, testimonial.company].filter(Boolean).join(' - ')}
                          </p>
                        )}
                        {testimonial.project && (
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('projects.title')}: {testimonial.project.title}
                          </p>
                        )}
                        <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">
                          {testimonial.content}
                        </p>
                        {testimonial.videoUrl && (
                          <p class="mt-2">
                            <a
                              href={testimonial.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                            >
                              {t('testimonials.videoLink')}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        onClick$={() => editTestimonial(testimonial)}
                        class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick$={() => handleDelete(testimonial)}
                        class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
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
  title: 'Testimonials - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage testimonials',
    },
  ],
};
