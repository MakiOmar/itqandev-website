import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z, useNavigate } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { TagInput } from '../../../../components/common/TagInput';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { ROUTES } from '../../../../lib/constants/routes';
import {
  ContentPrimaryLanguageSelect,
  FieldTranslationGlobe,
  TranslationsFormRoot,
} from '../../../../components/admin/PerFieldContentTranslations';
import { initialTranslationsJson, parseTranslationsJson, secondaryLocalesForContent } from '../../../../lib/content-translations';
import { useSiteLanguageConfig } from '../../layout';
import type { ProjectCreateInput, Project, Category, Skill } from '../../../../types';

/**
 * Project creation schema
 * Note: Qwik Form normalizes category_ids[] to an array automatically
 */
const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.union([z.boolean(), z.string()]).optional(),
  category_ids: z.array(z.string()).optional(),
  skill_ids: z.array(z.string()).optional(),
  link_url: z.string().url().optional().or(z.literal('')),
  repo_url: z.string().url().optional().or(z.literal('')),
  demo_url: z.string().url().optional().or(z.literal('')),
  published_at: z.string().optional(),
});

/**
 * Load categories and skills for form
 */
export const useCategoriesAndSkills = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const [categoriesRes, skillsRes] = await Promise.all([
      apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST),
      apiClient.get<Skill[]>(API_ENDPOINTS.SKILLS.LIST),
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
      categories: extractData<Category>(categoriesRes),
      skills: extractData<Skill>(skillsRes),
    };
  } catch (error: any) {
    console.error('Failed to load categories/skills:', error);
    return { categories: [], skills: [] };
  }
});

/**
 * Create project action
 */
export const useCreateProject = routeAction$(
  async (data) => {
    try {
      const apiClient = getApiClient();
      
      // Handle array fields - Qwik Form sends arrays, but we need to normalize them
      const normalizeArray = (value: any): number[] => {
        if (!value) return [];
        if (Array.isArray(value)) {
          return value.map((id) => (typeof id === 'string' ? Number(id) : id)).filter((id) => !isNaN(id));
        }
        if (typeof value === 'string') {
          return [Number(value)].filter((id) => !isNaN(id));
        }
        return [];
      };

      // Convert string IDs to numbers
      const payload: ProjectCreateInput = {
        title: data.title,
        slug: data.slug || undefined,
        summary: data.summary || undefined,
        description: data.description || undefined,
        status: (data.status as any) || 'draft',
        featured: data.featured === true || data.featured === '1' || data.featured === 'on',
        category_ids: normalizeArray(data.category_ids),
        skill_ids: normalizeArray(data.skill_ids),
        link_url: data.link_url || undefined,
        repo_url: data.repo_url || undefined,
        demo_url: data.demo_url || undefined,
        published_at : data.published_at || undefined,
      };

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as ProjectCreateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      if (parsedTranslations) {
        (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
      }

      const response = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS.CREATE, payload);
      const project = (response?.data ?? response) as any;
      const projectId = project.id;

      // Handle hero image upload/attachment
      if (data.heroMedia) {
        const heroData = typeof data.heroMedia === 'string' ? JSON.parse(data.heroMedia) : data.heroMedia;
        if (heroData.id) {
          // Existing media from library - just attach
          await apiClient.post(`/v1/media/project/${projectId}/hero`, {
            media_id: heroData.id,
          });
        } else if (heroData.file) {
          // New file upload - upload and attach
          const formData = new FormData();
          formData.append('file', heroData.file);
          const uploadedMedia = await apiClient.post('/v1/media/upload', formData);
          await apiClient.post(`/v1/media/project/${projectId}/hero`, {
            media_id: (uploadedMedia as any)?.id,
          });
        }
      }

      // Handle video upload/attachment
      if (data.videoMedia) {
        const videoData = typeof data.videoMedia === 'string' ? JSON.parse(data.videoMedia) : data.videoMedia;
        if (videoData.id) {
          // Existing media from library - just attach
          await apiClient.post(`/v1/media/project/${projectId}/video`, {
            media_id: videoData.id,
          });
        } else if (videoData.file) {
          // New file upload - upload and attach
          const formData = new FormData();
          formData.append('file', videoData.file);
          const uploadedMedia = await apiClient.post('/v1/media/upload', formData);
          await apiClient.post(`/v1/media/project/${projectId}/video`, {
            media_id: (uploadedMedia as any)?.id,
          });
        }
      }

      // Return project data for preview
      const savedProject = await apiClient.get(API_ENDPOINTS.PROJECTS.GET(projectId));
      return {
        success: true,
        project: savedProject,
        projectId,
      };
    } catch (error: any) {
      // Return error response instead of throwing
      return {
        success: false,
        error: error.message || 'Failed to create project',
      };
    }
  },
  zod$(projectSchema.extend({
    heroMedia: z.any().optional(),
    videoMedia: z.any().optional(),
    translations_json: z.string().optional(),
    content_locale: z.string().optional(),
  }))
);

/**
 * Project create page
 */
export default component$(() => {
  const { t } = useTranslate();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const categoriesAndSkills = useCategoriesAndSkills();
  const langConfig = useSiteLanguageConfig();
  const createAction = useCreateProject();

  // Pre-compute translation strings to avoid serialization issues
  const translations = {
    success: t('common.success'),
    error: t('common.error'),
    created: t('projects.created') || 'Project created successfully',
  };

  const categoryIds = useSignal<(string | number)[]>([]);
  const skillIds = useSignal<(string | number)[]>([]);
  const heroMedia = useSignal<any>(null);
  const videoMedia = useSignal<any>(null);
  const showHeroSelector = useSignal(false);
  const showVideoSelector = useSignal(false);
  const showPreview = useSignal(false);
  const savedProject = useSignal<any>(null);
  const createdProjectId = useSignal<number | null>(null);
  const actionResult = useSignal<{ success?: boolean; projectId?: number; error?: string } | null>(null);
  const contentLocaleDraft = useSignal('');
  
  // Extract submit method reference to avoid serialization issues
  const submitMethod = createAction.submit.bind(createAction);
  
  // Extract submit function to avoid serialization issues with createAction.value
  const submitProject = $((formData: FormData) => {
    // Use extracted submit method instead of createAction.submit
    return submitMethod(formData as any).then((response) => {
      // Extract only serializable properties to avoid .data access
      const val = response.value as any;
      if (val) {
        actionResult.value = {
          success: val.success === true,
          projectId: val.projectId || (val.project as { id?: number } | undefined)?.id,
          error: val.error || val.failed ? (val.error || 'Failed to create project') : undefined,
        };
      }
    }).catch(() => {
      actionResult.value = {
        success: false,
        error: 'Failed to create project',
      };
    });
  });

  const categoryItems = categoriesAndSkills.value.categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const skillItems = categoriesAndSkills.value.skills.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const translationSecondaries = secondaryLocalesForContent(
    langConfig.value.site_languages,
    langConfig.value.default_locale,
    contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
  );
  const projectTranslationsJson = initialTranslationsJson('project', translationSecondaries, null);

  // Handle postMessage from media iframe
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const handleMessage = $((event: MessageEvent) => {
      if (event.data?.type === 'media-selected') {
        const media = event.data.media;
        const callback = event.data.callback;
        
        if (callback === 'hero') {
          heroMedia.value = media;
          showHeroSelector.value = false;
        } else if (callback === 'video') {
          videoMedia.value = media;
          showVideoSelector.value = false;
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      cleanup(() => {
        window.removeEventListener('message', handleMessage);
      });
    }
  });

  // Handle successful project creation - track actionResult signal instead of createAction.value
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => actionResult.value);
    
    const result = actionResult.value;
    if (!result) return;
    
    if (result.success && !showPreview.value) {
      const projectId = result.projectId;
      if (projectId) {
        createdProjectId.value = projectId;
        savedProject.value = { id: projectId };
      }
      showPreview.value = true;
      success(translations.success, {
        text: translations.created,
      });
    } else if (result.error) {
      showError(translations.error, {
        text: result.error,
      });
    }
  });

  return (
    <>
      <PageHeader
        title={t('projects.create')}
        description={t('projects.subtitle')}
      >
        <div class="flex gap-2">
          <Link
            href={ROUTES.ADMIN.PROJECTS}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {t('common.back')}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <Form action={createAction} class="space-y-6">
          <TranslationsFormRoot
            kind="project"
            locales={translationSecondaries}
            initialJson={projectTranslationsJson}
            rtlBadge={t('contentTranslations.rtlBadge')}
            fallbackHintShort={t('contentTranslations.fallbackPlaceholderHint')}
          >
            <div class="grid gap-4 md:grid-cols-2">
              <ContentPrimaryLanguageSelect
                siteLanguages={langConfig.value.site_languages}
                defaultLocale={langConfig.value.default_locale}
                value={contentLocaleDraft.value}
                label={t('contentTranslations.contentPrimaryLanguage')}
                hint={t('contentTranslations.contentPrimaryHint')}
                useSiteDefaultLabel={t('contentTranslations.useSiteDefault')}
                onChange$={$((code: string) => {
                  contentLocaleDraft.value = code;
                })}
              />

              {!translationSecondaries.length ? (
                <p class="md:col-span-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('contentTranslations.noSecondaryLanguages')}
                </p>
              ) : null}

              <FieldTranslationGlobe
                fieldKey="title"
                gridSpan="one"
                globeAriaLabel={t('contentTranslations.globeTitle')}
                fallbackText=""
              >
                <div>
                  <label
                    for="title"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {t('projects.name')} *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {createAction.value?.failed && createAction.value.fieldErrors?.title && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {createAction.value.fieldErrors.title}
                    </p>
                  )}
                </div>
              </FieldTranslationGlobe>

              <div>
                <label
                  for="slug"
                  class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  {t('projects.slug')}
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>

            <div>
              <label
                for="status"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.status')}
              </label>
              <select
                id="status"
                name="status"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              >
                <option value="draft">{t('projects.statusDraft')}</option>
                <option value="published">{t('projects.statusPublished')}</option>
                <option value="archived">{t('projects.statusArchived')}</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input
                id="featured"
                name="featured"
                type="checkbox"
                value="1"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                for="featured"
                class="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.featured')}
              </label>
            </div>

            <div>
              <TagInput
                value={categoryIds.value}
                items={categoryItems}
                label={t('projects.categories')}
                placeholder={t('projects.searchCategories')}
                noResultsText={t('projects.noCategoriesFound')}
                onValueChange={$((value: (string | number)[]) => {
                  categoryIds.value = value;
                })}
              />
              {categoryIds.value.map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="category_ids[]"
                  value={String(id)}
                />
              ))}
            </div>

            <div>
              <TagInput
                value={skillIds.value}
                items={skillItems}
                label={t('projects.skills')}
                placeholder={t('projects.searchSkills')}
                noResultsText={t('projects.noSkillsFound')}
                onValueChange={$((value: (string | number)[]) => {
                  skillIds.value = value;
                })}
              />
              {skillIds.value.map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="skill_ids[]"
                  value={String(id)}
                />
              ))}
            </div>

              <FieldTranslationGlobe
                fieldKey="summary"
                gridSpan="full"
                globeAriaLabel={t('contentTranslations.globeSummary')}
                fallbackText=""
              >
                <div>
                  <label
                    for="summary"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {t('projects.summary')}
                  </label>
                  <textarea
                    id="summary"
                    name="summary"
                    rows={2}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </FieldTranslationGlobe>

              <FieldTranslationGlobe
                fieldKey="description"
                gridSpan="full"
                globeAriaLabel={t('contentTranslations.globeDescription')}
                fallbackText=""
              >
                <div>
                  <label
                    for="description"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {t('projects.description')}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </FieldTranslationGlobe>

            <div>
              <label
                for="link_url"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.linkUrl')}
              </label>
              <input
                id="link_url"
                name="link_url"
                type="url"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label
                for="repo_url"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.repoUrl')}
              </label>
              <input
                id="repo_url"
                name="repo_url"
                type="url"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label
                for="demo_url"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.demoUrl')}
              </label>
              <input
                id="demo_url"
                name="demo_url"
                type="url"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>

            <div>
              <label
                for="published_at"
                class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('projects.publishedAt')}
              </label>
              <input
                id="published_at"
                name="published_at"
                type="datetime-local"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              />
            </div>
          </div>
          </TranslationsFormRoot>

          {/* Hero Image Section - Matching ProjectEdit */}
          <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Hero Image</h3>
            {heroMedia.value ? (
              <div class="mb-3 flex items-center gap-3">
                {heroMedia.value.url ? (
                  <img
                    src={heroMedia.value.url}
                    alt={heroMedia.value.alt_text || heroMedia.value.name || ''}
                    width={96}
                    height={96}
                    class="h-24 w-24 rounded-lg border border-gray-300 object-cover dark:border-gray-700"
                  />
                ) : heroMedia.value.file ? (
                  <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                    <img
                      src={heroMedia.value.preview || ''}
                      alt={heroMedia.value.file?.name || ''}
                      width={96}
                      height={96}
                      class="h-full w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {heroMedia.value.name || heroMedia.value.file?.name || ''}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {heroMedia.value.size
                      ? `${(heroMedia.value.size / 1024).toFixed(2)} KB`
                      : heroMedia.value.file?.size
                        ? `${(heroMedia.value.file.size / 1024).toFixed(2)} KB`
                        : ''}{' '}
                    · {heroMedia.value.mime_type || heroMedia.value.file?.type || ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick$={() => {
                    heroMedia.value = null;
                  }}
                  class="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">No hero image selected.</div>
            )}
            <div class="flex gap-2">
              <input
                type="file"
                accept="image/*"
                id="hero-file-input"
                class="hidden"
                onChange$={(e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const preview = URL.createObjectURL(file);
                  heroMedia.value = {
                    file,
                    preview,
                    name: file.name,
                    size: file.size,
                    mime_type: file.type,
                  };
                  if (e.target) {
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick$={() => {
                  document.getElementById('hero-file-input')?.click();
                }}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Upload File
              </button>
              <button
                type="button"
                onClick$={() => {
                  showHeroSelector.value = true;
                }}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {heroMedia.value ? 'Change Hero Image' : 'Select from Library'}
              </button>
            </div>
          </div>

          {/* Video Section - Matching ProjectEdit */}
          <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Video</h3>
            {videoMedia.value ? (
              <div class="mb-3">
                <div class="mb-3 flex items-center gap-3">
                  {videoMedia.value.url ? (
                    <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
                      <video src={videoMedia.value.url} class="h-full w-full object-cover" muted />
                    </div>
                  ) : (
                    <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                      <svg
                        class="h-8 w-8 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M14.752 11.168l-6.586-3.793A1 1 0 007 8.191v7.618a1 1 0 001.166.986l6.586-3.793a1 1 0 000-1.834z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {videoMedia.value.name || videoMedia.value.file?.name || ''}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {videoMedia.value.size
                        ? `${(videoMedia.value.size / 1024 / 1024).toFixed(2)} MB`
                        : videoMedia.value.file?.size
                          ? `${(videoMedia.value.file.size / 1024 / 1024).toFixed(2)} MB`
                          : ''}{' '}
                      · {videoMedia.value.mime_type || videoMedia.value.file?.type || ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick$={() => {
                      videoMedia.value = null;
                    }}
                    class="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
                {videoMedia.value.url && (
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <video src={videoMedia.value.url} controls class="w-full max-w-2xl" />
                  </div>
                )}
              </div>
            ) : (
              <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">No video selected.</div>
            )}
            <div class="flex gap-2">
              <input
                type="file"
                accept="video/*"
                id="video-file-input"
                class="hidden"
                onChange$={(e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  videoMedia.value = {
                    file,
                    name: file.name,
                    size: file.size,
                    mime_type: file.type,
                  };
                  if (e.target) {
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick$={() => {
                  document.getElementById('video-file-input')?.click();
                }}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Upload File
              </button>
              <button
                type="button"
                onClick$={() => {
                  showVideoSelector.value = true;
                }}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {videoMedia.value ? 'Change Video' : 'Select from Library'}
              </button>
            </div>
          </div>

          {createAction.value?.failed && (createAction.value as any).error && (
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              {(createAction.value as any).error}
            </div>
          )}

          <div class="flex justify-end gap-2">
            <Link
              href={ROUTES.ADMIN.PROJECTS}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={createAction.isRunning}
              onClick$={async (e) => {
                e.preventDefault();
                // Include media in form submission
                const target = e.target as HTMLElement;
                const form = target?.closest('form') as HTMLFormElement;
                if (form) {
                  const formData = new FormData(form);
                  if (heroMedia.value) {
                    formData.append('heroMedia', JSON.stringify(heroMedia.value));
                  }
                  if (videoMedia.value) {
                    formData.append('videoMedia', JSON.stringify(videoMedia.value));
                  }
                  // Submit form using extracted function to avoid serialization issues
                  await submitProject(formData);
                }
              }}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {createAction.isRunning ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Form>

        {/* Media Selectors as Modals - Matching ProjectEdit */}
        {showHeroSelector.value && (
          <div class="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
            <div class="container mx-auto max-w-screen-2xl p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('media.selectMedia') || 'Select Hero Image'}
                </h2>
                <button
                  onClick$={() => (showHeroSelector.value = false)}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
              <iframe
                src={`${ROUTES.ADMIN.MEDIA}?select=true&accept=image/*&callback=hero`}
                class="w-full h-[calc(100vh-200px)] border border-gray-200 rounded-lg dark:border-gray-700"
              />
            </div>
          </div>
        )}

        {showVideoSelector.value && (
          <div class="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
            <div class="container mx-auto max-w-screen-2xl p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('media.selectMedia') || 'Select Video'}
                </h2>
                <button
                  onClick$={() => (showVideoSelector.value = false)}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
              <iframe
                src={`${ROUTES.ADMIN.MEDIA}?select=true&accept=video/*&callback=video`}
                class="w-full h-[calc(100vh-200px)] border border-gray-200 rounded-lg dark:border-gray-700"
              />
            </div>
          </div>
        )}

        {/* Preview Modal - Matching ProjectEdit */}
        {showPreview.value && savedProject.value && (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick$={() => {
              showPreview.value = false;
              // Use the stored project ID from signal instead of accessing createAction.value
              const savedId = (savedProject.value as { id?: number } | null)?.id;
              const storedProjectId = createdProjectId.value;
              const projectId = savedId || storedProjectId;
              if (projectId) {
                navigate(ROUTES.ADMIN.PROJECTS_EDIT(projectId));
              }
            }}
          >
            <div
              class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
              onClick$={(e) => e.stopPropagation()}
            >
              <div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {t('projects.preview') || 'Project Preview'}
                  </h2>
                  <button
                    onClick$={() => {
                      showPreview.value = false;
                      // Use the stored project ID from signal instead of accessing createAction.value
                      const savedId = (savedProject.value as { id?: number } | null)?.id;
                      const storedProjectId = createdProjectId.value;
                      const projectId = savedId || storedProjectId;
                      if (projectId) {
                        navigate(ROUTES.ADMIN.PROJECTS_EDIT(projectId));
                      }
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('common.close') || 'Close'}
                  </button>
                </div>
              </div>

              <div class="p-6">
                <div class="space-y-6">
                  {/* Project Title */}
                  <div>
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {(savedProject.value as any).title}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Slug: {(savedProject.value as any).slug}
                    </p>
                  </div>

                  {/* Hero Image */}
                  {(savedProject.value as any)?.media?.hero?.[0] && (
                    <div>
                      <h4 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Hero Image</h4>
                      <img
                        src={(savedProject.value as any).media.hero[0].url}
                        alt={(savedProject.value as any).media.hero[0].alt_text || ''}
                        width={800}
                        height={600}
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  )}

                  {/* Video */}
                  {(savedProject.value as any)?.media?.video?.[0] && (
                    <div>
                      <h4 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Video</h4>
                      <video
                        src={(savedProject.value as any).media.video[0].url}
                        controls
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  )}

                  {/* Project Details */}
                  {(savedProject.value as any).summary && (
                    <div>
                      <h4 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Summary</h4>
                      <p class="text-gray-700 dark:text-gray-300">{(savedProject.value as any).summary}</p>
                    </div>
                  )}

                  {(savedProject.value as any).description && (
                    <div>
                      <h4 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Description</h4>
                      <div
                        class="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={(savedProject.value as any).description}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Create Project - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Create a new project',
    },
  ],
};
