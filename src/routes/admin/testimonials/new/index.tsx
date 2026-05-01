import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { ROUTES } from '../../../../lib/constants/routes';
import { useCreateTestimonial } from '../../../../lib/admin/testimonial-actions';
import { loadTestimonialProjectsContext } from '../../../../lib/admin/testimonial-form-context';

/** Projects + feature flag (shared logic with edit page). */
export const useProjectsForNewTestimonialPage = routeLoader$(async ({ cookie, request }) => {
  try {
    return await loadTestimonialProjectsContext(cookie, request);
  } catch (e) {
    console.error('Failed to load testimonial form context:', e);
    return { projects: [], projectsManagementEnabled: false };
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const projectsContext = useProjectsForNewTestimonialPage();
  const createAction = useCreateTestimonial();

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    createdText: String(translateApp(lang, 'common.created')),
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

  const handleSave = $(async () => {
    const successTitle = saveTranslations.successTitle;
    const createdText = saveTranslations.createdText;
    const response = await createAction.submit(formData.value);
    if (response.value?.failed) {
      const errorMsg =
        (response.value as { message?: string }).message ||
        (response.value as { error?: string }).error ||
        'Failed to create testimonial';
      await showError(errorMsg);
    } else {
      await success(successTitle, { text: createdText });
      await navigate(ROUTES.ADMIN.TESTIMONIALS);
    }
  });

  return (
    <>
      <PageHeader title={translateApp(lang, 'testimonials.addNew')} description={translateApp(lang, 'testimonials.subtitle')}>
        <Link
          href={ROUTES.ADMIN.TESTIMONIALS}
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'testimonials.backToList')}
        </Link>
      </PageHeader>

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
              {translateApp(lang, 'common.add')}
            </button>
            <Link
              href={ROUTES.ADMIN.TESTIMONIALS}
              class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.cancel')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'New testimonial - Dashboard',
  meta: [{ name: 'description', content: 'Create testimonial' }],
};
