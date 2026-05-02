import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { getLocalizedRoutes, routesFromPreferredCookie, useAppRoutes } from '../../../../../lib/constants/routes';
import type { Testimonial } from '../../../../../types';
import { mapTestimonialFromApi, useUpdateTestimonial } from '../../../../../lib/admin/testimonial-actions';
import { loadTestimonialProjectsContext } from '../../../../../lib/admin/testimonial-form-context';

export const useTestimonialForEdit = routeLoader$(async ({ params, cookie, request, fail, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  try {
    const id = params.id;
    // Static "new" must be handled by /testimonials/new; if the router matched this segment first, redirect.
    if (id === 'new') {
      throw redirectFn(302, R.ADMIN.TESTIMONIALS_NEW);
    }
    if (!id) {
      return fail(404, { message: 'Not found' });
    }
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.TESTIMONIALS.GET(id));
    const raw = ((response as { data?: unknown })?.data ?? response) as unknown as Record<string, unknown>;
    if (!raw || raw.id == null) {
      return fail(404, { message: 'Not found' });
    }
    return mapTestimonialFromApi(raw as Record<string, unknown>);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
    return fail(404, { message: 'Not found' });
  }
});

export const useProjectsForEditTestimonialPage = routeLoader$(async ({ cookie, request }) => {
  try {
    return await loadTestimonialProjectsContext(cookie, request);
  } catch (e) {
    console.error('Failed to load testimonial form context:', e);
    return { projects: [], projectsManagementEnabled: false };
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const testimonialLoader = useTestimonialForEdit();
  const projectsContext = useProjectsForEditTestimonialPage();
  const updateAction = useUpdateTestimonial();

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    updatedText: String(translateApp(lang, 'common.updated')),
  };

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

  useTask$(({ track }) => {
    const ctx = track(() => projectsContext.value);
    const row = track(() => testimonialLoader.value) as Testimonial | { failed?: boolean } | undefined;
    if (!row || typeof row !== 'object' || 'failed' in row) {
      return;
    }
    const testimonial = row as Testimonial;
    let projectId = testimonial.projectId ? String(testimonial.projectId) : '';
    if (!ctx.projectsManagementEnabled || ctx.projects.length === 0) {
      projectId = '';
    } else if (projectId && !ctx.projects.some((p) => String(p.id) === projectId)) {
      projectId = '';
    }
    formData.value = {
      project_id: projectId,
      client_name: testimonial.clientName,
      client_role: testimonial.clientRole || '',
      company: testimonial.company || '',
      rating: testimonial.rating || 5,
      content: testimonial.content,
      video_url: testimonial.videoUrl || '',
      approved: testimonial.approved || false,
    };
  });

  const handleSave = $(async () => {
    const row = testimonialLoader.value as Testimonial | { failed?: boolean };
    if (!row || typeof row !== 'object' || 'failed' in row || !('id' in row)) {
      await showError('Invalid testimonial');
      return;
    }
    const id = String((row as Testimonial).id);
    const successTitle = saveTranslations.successTitle;
    const updatedText = saveTranslations.updatedText;
    const response = await updateAction.submit({
      id,
      ...formData.value,
    });
    if (response.value?.failed) {
      const errorMsg =
        (response.value as { message?: string }).message ||
        (response.value as { error?: string }).error ||
        'Failed to update testimonial';
      await showError(errorMsg);
    } else {
      await success(successTitle, { text: updatedText });
      await navigate(getLocalizedRoutes(lang).ADMIN.TESTIMONIALS);
    }
  });

  const row = testimonialLoader.value as Testimonial | { failed?: boolean };
  const isFailed = row && typeof row === 'object' && 'failed' in row;

  return (
    <>
      <PageHeader title={translateApp(lang, 'testimonials.edit')} description={translateApp(lang, 'testimonials.subtitle')}>
        <Link
          href={R.ADMIN.TESTIMONIALS}
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'testimonials.backToList')}
        </Link>
      </PageHeader>

      {isFailed ? (
        <p class="text-sm text-red-600 dark:text-red-400">{translateApp(lang, 'common.error')}</p>
      ) : (
        <div class="max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="space-y-4">
            {projectsContext.value.projectsManagementEnabled && projectsContext.value.projects.length > 0 ? (
              <div>
                <label for="project_id" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {translateApp(lang, 'testimonials.project')}
                </label>
                <select
                  id="project_id"
                  value={formData.value.project_id}
                  onChange$={(e) => {
                    formData.value = { ...formData.value, project_id: (e.target as HTMLSelectElement).value };
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  <option value="">{translateApp(lang, 'testimonials.noProject')}</option>
                  {projectsContext.value.projects.map((proj) => (
                    <option key={proj.id} value={String(proj.id)}>
                      {proj.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label for="client_name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'testimonials.clientName')} *
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
                <label for="client_role" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {translateApp(lang, 'testimonials.clientRole')}
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
                <label for="company" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {translateApp(lang, 'testimonials.company')}
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
              <label for="rating" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'testimonials.rating')}
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
              <label for="content" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'testimonials.content')} *
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
              <label for="video_url" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'testimonials.videoUrl')}
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
              <label for="approved" class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'testimonials.approved')}
              </label>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onClick$={handleSave}
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'common.update')}
              </button>
              <Link
                href={R.ADMIN.TESTIMONIALS}
                class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.cancel')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit testimonial - Dashboard',
  meta: [{ name: 'description', content: 'Edit testimonial' }],
};
