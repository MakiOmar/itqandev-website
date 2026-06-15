import { component$, useSignal, $, useTask$, useComputed$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
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
  mergeTestimonialFieldsForUiLocale,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { mapTestimonialFromApi, runTestimonialUpdateFromBrowser } from '../../../../../lib/admin/testimonial-actions';
import { loadTestimonialProjectsContext } from '../../../../../lib/admin/testimonial-form-context';
import type { Testimonial } from '../../../../../types';

export const useTestimonialForEdit = routeLoader$(async ({ params, cookie, request, fail, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  try {
    const id = params.id;
    if (id === 'new') {
      throw redirectFn(302, R.ADMIN.TESTIMONIALS_NEW);
    }
    if (!id) {
      return fail(404, { message: 'Not found' });
    }
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader, false);
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
  const langConfig = usePublicSiteMeta();
  const testimonialLoader = useTestimonialForEdit();
  const projectsContext = useProjectsForEditTestimonialPage();
  const liveTestimonial = useSignal<Testimonial | null>(null);
  const saveRunning = useSignal(false);

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    updatedText: String(translateApp(lang, 'common.updated')),
  };

  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalClientName = useSignal('');
  const canonicalContent = useSignal('');
  const canonicalClientRole = useSignal('');
  const canonicalCompany = useSignal('');
  const translationsJson = useSignal('[]');

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
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const loaderRow = track(() => testimonialLoader.value) as Testimonial | { failed?: boolean } | undefined;
    if (!loaderRow || typeof loaderRow !== 'object' || 'failed' in loaderRow) {
      return;
    }
    const existing = liveTestimonial.value;
    if (existing == null || existing.id !== (loaderRow as Testimonial).id) {
      liveTestimonial.value = loaderRow as Testimonial;
    }
    const t = (liveTestimonial.value ?? loaderRow) as Testimonial;
    const ctx = track(() => projectsContext.value);

    contentLocaleDraft.value =
      t.contentLocale != null && String(t.contentLocale).trim() !== '' ? String(t.contentLocale).trim() : '';
    canonicalClientName.value = t.clientName ?? '';
    canonicalContent.value = t.content ?? '';
    canonicalClientRole.value = t.clientRole ?? '';
    canonicalCompany.value = t.company ?? '';

    let projectId = t.projectId ? String(t.projectId) : '';
    if (!ctx.projectsManagementEnabled || ctx.projects.length === 0) {
      projectId = '';
    } else if (projectId && !ctx.projects.some((p) => String(p.id) === projectId)) {
      projectId = '';
    }

    formData.value = {
      project_id: projectId,
      client_name: t.clientName,
      client_role: t.clientRole || '',
      company: t.company || '',
      rating: t.rating || 5,
      content: t.content,
      video_url: t.videoUrl || '',
      approved: t.approved || false,
    };

    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = t.translations?.find((x) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return {
          locale: l.code,
          content: row?.content ?? '',
          client_role: row?.client_role ?? '',
          company: row?.company ?? '',
        };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => liveTestimonial.value);
    track(() => testimonialLoader.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    track(() => contentLocaleDraft.value);
    const t = (liveTestimonial.value ?? testimonialLoader.value) as Testimonial | { failed?: boolean } | undefined;
    if (!t || typeof t !== 'object' || 'failed' in t || !('id' in t)) {
      return;
    }
    const m = mergeTestimonialFieldsForUiLocale(
      t as Testimonial,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    formData.value = {
      ...formData.value,
      client_role: m.client_role,
      company: m.company,
      content: m.content,
    };
  });

  useTask$(({ track }) => {
    track(() => formData.value.client_name);
    track(() => formData.value.content);
    track(() => formData.value.client_role);
    track(() => formData.value.company);
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
      canonicalClientName.value = formData.value.client_name;
      canonicalContent.value = formData.value.content;
      canonicalClientRole.value = formData.value.client_role;
      canonicalCompany.value = formData.value.company;
    }
  });

  const isPrimaryEditing = useComputed$(() =>
    shouldWritePrimaryColumns(
      normalizeEditingLocale(
        editingLocaleDraft.value,
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
      primaryLocaleForContent(
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
    ),
  );

  const handleSave = $(async () => {
    const t = (liveTestimonial.value ?? testimonialLoader.value) as Testimonial | { failed?: boolean } | undefined;
    if (!t || typeof t !== 'object' || 'failed' in t || !('id' in t)) {
      await showError('Invalid testimonial');
      return;
    }
    if (saveRunning.value) return;
    saveRunning.value = true;

    const val = await runTestimonialUpdateFromBrowser({
      id: String((t as Testimonial).id),
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
      canonical_client_name: canonicalClientName.value,
      canonical_content: canonicalContent.value,
      canonical_client_role: canonicalClientRole.value,
      canonical_company: canonicalCompany.value,
      translations_json: translationsJson.value,
      content_locale: contentLocaleDraft.value,
      project_id: formData.value.project_id,
      client_name: formData.value.client_name,
      client_role: formData.value.client_role,
      company: formData.value.company,
      rating: formData.value.rating,
      content: formData.value.content,
      video_url: formData.value.video_url,
      approved: formData.value.approved ? '1' : undefined,
    });

    if (!val.ok) {
      saveRunning.value = false;
      await showError(val.message || 'Failed to update testimonial');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.updatedText });
    saveRunning.value = false;
    window.location.reload();
  });

  const row = (liveTestimonial.value ?? testimonialLoader.value) as Testimonial | { failed?: boolean } | undefined;
  const isFailed = row && typeof row === 'object' && 'failed' in row;

  if (isFailed) {
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
        <p class="text-sm text-red-600 dark:text-red-400">{translateApp(lang, 'common.error')}</p>
      </>
    );
  }

  if (!row || typeof row !== 'object' || !('id' in row)) {
    return (
      <div class="p-6 text-center text-gray-600 dark:text-gray-300">
        <p>{translateApp(lang, 'common.notFound') || 'Not found'}</p>
        <Link href={R.ADMIN.TESTIMONIALS} class="mt-2 inline-block text-primary-600">
          {translateApp(lang, 'common.back')}
        </Link>
      </div>
    );
  }

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

      <div class="max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
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
              const current = (liveTestimonial.value ?? testimonialLoader.value) as Testimonial | undefined;
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => {
                  const tr = current?.translations?.find(
                    (x) => String(x?.locale).toLowerCase() === l.code.toLowerCase(),
                  );
                  return {
                    locale: l.code,
                    content: tr?.content ?? '',
                    client_role: tr?.client_role ?? '',
                    company: tr?.company ?? '',
                  };
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
              value={isPrimaryEditing.value ? formData.value.client_name : canonicalClientName.value}
              disabled={!isPrimaryEditing.value}
              onInput$={(e) => {
                formData.value = { ...formData.value, client_name: (e.target as HTMLInputElement).value };
              }}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800 dark:focus:ring-primary-700/40"
              required
            />
            {!isPrimaryEditing.value && (
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {translateApp(lang, 'contentTranslations.defaultHint')}
              </p>
            )}
          </div>

          <EditingLocaleFieldsShell siteLanguages={langConfig.value.site_languages} editingLocale={editingLocaleDraft}>
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
          </EditingLocaleFieldsShell>

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
              disabled={saveRunning.value}
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
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
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit testimonial - Dashboard',
  meta: [{ name: 'description', content: 'Edit testimonial' }],
};
