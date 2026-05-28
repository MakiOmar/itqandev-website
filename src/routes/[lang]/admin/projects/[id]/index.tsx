import { component$, useSignal, $, useTask$, untrack } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z, useLocation } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { TagInput } from '../../../../../components/common/TagInput';
import { LoadingSpinner } from '../../../../../components/common/LoadingSpinner';
import { MediaSelector } from '../../../../../components/common/MediaSelector';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import {
  fetchTaxonomyListOptions,
  fetchTaxonomyListOptionsForAdminRoute,
} from '../../../../../lib/admin/taxonomy-list-options';
import { useLocaleAwareTaxonomyOptions } from '../../../../../lib/hooks/useLocaleAwareTaxonomyOptions';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import {
  ContentEditingLanguageSelect,
  EditingLocaleFieldsShell,
  TranslationsFormRoot,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { RichTextEditorField } from '../../../../../components/admin/RichTextEditorField';
import { initialTranslationsJson, parseTranslationsJson, secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  mergeProjectFieldsForUiLocale,
  mergeSecondaryProjectTranslations,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { useSiteLanguageConfig } from '../../layout';
import type { Project, ProjectUpdateInput, Category, Skill, Media, ProjectSeoMeta } from '../../../../../types';
import { useContentSlugAutosuggestTitleSlugSignals } from '../../../../../lib/slug/content-slug-auto';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';
import { ContentSeoFields } from '../../../../../components/admin/ContentSeoFields';
import { buildSeoMorphPutBody } from '../../../../../lib/admin/content-seo-put';
import {
  contentSeoDraftFromRow,
  emptyContentSeoDraft,
  mergeContentSeoDraftFromContent,
  seoDraftToMetaRow,
  parseContentSeoDraftFromJson,
  type ContentSeoDraft,
} from '../../../../../types/content-seo';

/**
 * Project update schema
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
  link_url: z.union([z.string().url(), z.literal(''), z.literal('#')]).optional(),
  repo_url: z.union([z.string().url(), z.literal(''), z.literal('#')]).optional(),
  demo_url: z.union([z.string().url(), z.literal(''), z.literal('#')]).optional(),
  published_at: z.string().optional(),
});

const normalizeOptionalUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

/**
 * Load project data
 */
export const useProject = routeLoader$(async ({ params, fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader, false);
    const response = await apiClient.get<Project>(API_ENDPOINTS.PROJECTS.GET(params.id));
    const project = (response?.data ?? response) as any;
    
    // Ensure media structure exists - ProjectResource should include it, but handle fallback
    if (project && !project.media) {
      try {
        // Try to load hero image
        const heroList = await apiClient
          .get(`/v1/media?model_type=App\\Models\\Project&model_id=${params.id}&collection=hero`)
          .catch(() => ({ data: [] }));
        const heroData = heroList?.data ?? heroList ?? [];
        const hero = Array.isArray(heroData) ? heroData[0] || null : heroData || null;
        
        // Try to load video
        const videoList = await apiClient
          .get(`/v1/media?model_type=App\\Models\\Project&model_id=${params.id}&collection=video`)
          .catch(() => ({ data: [] }));
        const videoData = videoList?.data ?? videoList ?? [];
        const video = Array.isArray(videoData) ? videoData[0] || null : videoData || null;
        
        project.media = { hero, video };
      } catch (err) {
        console.warn('Failed to load project media:', err);
        project.media = { hero: null, video: null };
      }
    } else if (project && project.media) {
      // Ensure media object has hero and video keys even if they're undefined
      if (!('hero' in project.media)) {
        project.media.hero = null;
      }
      if (!('video' in project.media)) {
        project.media.video = null;
      }
    }
    
    return project as Project;
  } catch (error: any) {
    return fail(404, { message: error.message || 'Project not found' });
  }
});

/**
 * Load categories and skills for form
 */
export const useCategoriesAndSkills = routeLoader$(async ({ cookie, request, params }) => {
  try {
    return await fetchTaxonomyListOptionsForAdminRoute(cookie, request, params.lang);
  } catch (error: any) {
    console.error('Failed to load categories/skills:', error);
    return { categories: [], skills: [] };
  }
});

/**
 * Update project action - Matching Vue Dashboard (includes media handling)
 */
export const useUpdateProject = routeAction$(
  async (data, { params, cookie, request }) => {
    try {
      // Extract cookie header for server-side authentication
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader, false);

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

      const ui = String((data as { editing_locale?: string }).editing_locale || 'en').toLowerCase();
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en').toLowerCase();
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef).toLowerCase();
      const title = String(data.title || '');
      const summary = String(data.summary ?? '');
      const description = String(data.description ?? '');
      const canonicalTitle = String((data as { canonical_title?: string }).canonical_title ?? '');
      const canonicalSummary = String((data as { canonical_summary?: string }).canonical_summary ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');

      // Convert string IDs to numbers
      const payload: ProjectUpdateInput = {
        id: Number(params.id),
        title: ui === effectivePrimary ? title : canonicalTitle,
        slug: data.slug || undefined,
        summary: ui === effectivePrimary ? summary : canonicalSummary,
        description: ui === effectivePrimary ? description : canonicalDescription,
        status: (data.status as any) || 'draft',
        featured: data.featured === true || data.featured === '1' || data.featured === 'on',
        category_ids: normalizeArray(data.category_ids),
        skill_ids: normalizeArray(data.skill_ids),
        link_url: normalizeOptionalUrl(data.link_url),
        repo_url: normalizeOptionalUrl(data.repo_url),
        demo_url: normalizeOptionalUrl(data.demo_url),
        published_at: data.published_at || undefined,
      };
      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as ProjectUpdateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      if (shouldWritePrimaryColumns(ui, effectivePrimary)) {
        if (parsedTranslations) {
          (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
        }
      } else {
        (payload as unknown as { translations?: unknown[] }).translations = mergeSecondaryProjectTranslations(
          (data as { translations_json?: string }).translations_json,
          ui,
          { title, summary, description },
        );
      }

      // Get original project data to compare media IDs (before update)
      const originalProject = await apiClient.get(API_ENDPOINTS.PROJECTS.GET(params.id));
      const originalProjectData = (originalProject as any)?.data || originalProject;
      const originalHeroId = originalProjectData?.media?.hero?.id ? Number(originalProjectData.media.hero.id) : null;
      const originalVideoId = originalProjectData?.media?.video?.id ? Number(originalProjectData.media.video.id) : null;

      const project = await apiClient.put(API_ENDPOINTS.PROJECTS.UPDATE(params.id), payload);
      const projectId = (project as any)?.data?.id || (project as any)?.id || params.id;

      // Handle hero image upload/attachment
      if (data.heroMedia) {
        try {
          const heroData = typeof data.heroMedia === 'string' ? JSON.parse(data.heroMedia) : data.heroMedia;
          const heroMediaId = heroData.id ? Number(heroData.id) : null;
          
          // Only attach if it's a new selection (different from original) or a new file upload
          if (heroData.file || (heroMediaId && heroMediaId !== originalHeroId)) {
            if (heroData.file) {
              // New file upload - upload and attach
              const formData = new FormData();
              formData.append('file', heroData.file);
              const uploadedMedia = await apiClient.post('/v1/media/upload', formData);
              const uploadedMediaId = Number((uploadedMedia as any)?.id);
              if (isNaN(uploadedMediaId) || uploadedMediaId <= 0) {
                throw new Error(`Invalid uploaded media ID: ${(uploadedMedia as any)?.id}`);
              }
              await apiClient.post(`/v1/media/project/${projectId}/hero`, {
                media_id: uploadedMediaId,
              });
            } else if (heroMediaId) {
              // Existing media from library - just attach (only if different from original)
              if (isNaN(heroMediaId) || heroMediaId <= 0) {
                throw new Error(`Invalid media ID: ${heroData.id}`);
              }
              await apiClient.post(`/v1/media/project/${projectId}/hero`, {
                media_id: heroMediaId,
              });
            }
          }
          // If heroMediaId === originalHeroId, skip attachment (no change)
        } catch (error: any) {
          console.error('Hero attachment error:', error);
          throw new Error(`Failed to attach hero image: ${error.message || 'Unknown error'}`);
        }
      }

      // Handle video upload/attachment
      if (data.videoMedia) {
        try {
          const videoData = typeof data.videoMedia === 'string' ? JSON.parse(data.videoMedia) : data.videoMedia;
          const videoMediaId = videoData.id ? Number(videoData.id) : null;
          
          // Only attach if it's a new selection (different from original) or a new file upload
          if (videoData.file || (videoMediaId && videoMediaId !== originalVideoId)) {
            if (videoData.file) {
              // New file upload - upload and attach
              const formData = new FormData();
              formData.append('file', videoData.file);
              const uploadedMedia = await apiClient.post('/v1/media/upload', formData);
              const uploadedMediaId = Number((uploadedMedia as any)?.id);
              if (isNaN(uploadedMediaId) || uploadedMediaId <= 0) {
                throw new Error(`Invalid uploaded media ID: ${(uploadedMedia as any)?.id}`);
              }
              await apiClient.post(`/v1/media/project/${projectId}/video`, {
                media_id: uploadedMediaId,
              });
            } else if (videoMediaId) {
              // Existing media from library - just attach (only if different from original)
              if (isNaN(videoMediaId) || videoMediaId <= 0) {
                throw new Error(`Invalid media ID: ${videoData.id}`);
              }
              await apiClient.post(`/v1/media/project/${projectId}/video`, {
                media_id: videoMediaId,
              });
            }
          }
          // If videoMediaId === originalVideoId, skip attachment (no change)
        } catch (error: any) {
          console.error('Video attachment error:', error);
          throw new Error(`Failed to attach video: ${error.message || 'Unknown error'}`);
        }
      }

      const seoLocale = String((data as { seo_locale?: string }).seo_locale || '').trim().toLowerCase();
      const seoDraftRaw = String((data as { seo_draft_json?: string }).seo_draft_json ?? '');
      if (seoLocale !== '' && seoDraftRaw !== '') {
        const seoDraftParsed = parseContentSeoDraftFromJson(seoDraftRaw);
        if (!seoDraftParsed) {
          return {
            success: false,
            error: 'Invalid SEO draft data',
          };
        }
        try {
          await apiClient.put(`/v1/seo/project/${projectId}`, buildSeoMorphPutBody(seoLocale, seoDraftParsed));
        } catch (seoErr: any) {
          return {
            success: false,
            error: seoErr?.message || 'Failed to save SEO',
          };
        }
      }

      // Return success response - stay on edit page
      // Return only serializable data (use existing projectId variable)
      return {
        success: true,
        projectId: Number(projectId),
      };
    } catch (error: any) {
      // Re-throw redirects (Qwik redirects are thrown as errors with status and location)
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }
      if (error?.status === 302 || error?.statusCode === 302) {
        throw error; // Re-throw redirects
      }
      // Return error response instead of throwing
      return {
        success: false,
        error: error?.message || (typeof error === 'string' ? error : 'Failed to update project'),
      };
    }
  },
  zod$(
    projectSchema.extend({
      heroMedia: z.any().optional(),
      videoMedia: z.any().optional(),
      translations_json: z.string().optional(),
      content_locale: z.string().optional(),
      editing_locale: z.string().optional(),
      form_site_default_locale: z.string().optional(),
      effective_primary_locale: z.string().optional(),
      canonical_title: z.string().optional(),
      canonical_summary: z.string().optional(),
      canonical_description: z.string().optional(),
      seo_locale: z.string().optional(),
      seo_draft_json: z.string().optional(),
    }),
  )
);

/**
 * Project edit page
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();

  // Pre-compute strings used heavily in this screen (readable JSX + avoids repeating translateApp calls).
  const translations = {
    back: translateApp(lang, 'common.back'),
    loading: translateApp(lang, 'common.loading'),
    save: translateApp(lang, 'common.save'),
    cancel: translateApp(lang, 'common.cancel'),
    close: translateApp(lang, 'common.close'),
    done: translateApp(lang, 'common.done'),
    success: translateApp(lang, 'common.success'),
    edit: translateApp(lang, 'projects.edit'),
    subtitle: translateApp(lang, 'projects.subtitle'),
    name: translateApp(lang, 'projects.name'),
    slug: translateApp(lang, 'projects.slug'),
    status: translateApp(lang, 'projects.status'),
    statusDraft: translateApp(lang, 'projects.statusDraft'),
    statusPublished: translateApp(lang, 'projects.statusPublished'),
    statusArchived: translateApp(lang, 'projects.statusArchived'),
    featured: translateApp(lang, 'projects.featured'),
    categories: translateApp(lang, 'projects.categories'),
    searchCategories: translateApp(lang, 'projects.searchCategories'),
    noCategoriesFound: translateApp(lang, 'projects.noCategoriesFound'),
    skills: translateApp(lang, 'projects.skills'),
    searchSkills: translateApp(lang, 'projects.searchSkills'),
    noSkillsFound: translateApp(lang, 'projects.noSkillsFound'),
    summary: translateApp(lang, 'projects.summary'),
    description: translateApp(lang, 'projects.description'),
    linkUrl: translateApp(lang, 'projects.linkUrl'),
    repoUrl: translateApp(lang, 'projects.repoUrl'),
    demoUrl: translateApp(lang, 'projects.demoUrl'),
    publishedAt: translateApp(lang, 'projects.publishedAt'),
    updated: translateApp(lang, 'projects.updated'),
    preview: translateApp(lang, 'projects.preview'),
    selectMedia: translateApp(lang, 'media.selectMedia'),
    ctAdd: translateApp(lang, 'contentTranslations.addTranslations'),
    ctCollapseTranslations: translateApp(lang, 'contentTranslations.collapseTranslations'),
    ctSection: translateApp(lang, 'contentTranslations.sectionTitle'),
    ctHint: translateApp(lang, 'contentTranslations.defaultHint'),
    ctNoLangs: translateApp(lang, 'contentTranslations.noSecondaryLanguages'),
    ctRtl: translateApp(lang, 'contentTranslations.rtlBadge'),
    ctPrimaryLang: translateApp(lang, 'contentTranslations.contentPrimaryLanguage'),
    ctPrimaryHint: translateApp(lang, 'contentTranslations.contentPrimaryHint'),
    ctUseSiteDefault: translateApp(lang, 'contentTranslations.useSiteDefault'),
    ctFallbackHint: translateApp(lang, 'contentTranslations.fallbackPlaceholderHint'),
    seoTitle: translateApp(lang, 'seo.title'),
    seoForEditingLocale: translateApp(lang, 'seo.forEditingLocale'),
  };
  
  const { success, error: showError } = useSwal({
    confirmTitle: translateApp(lang, 'common.confirm'),
    yes: translateApp(lang, 'common.yes'),
    no: translateApp(lang, 'common.no'),
    alertTitle: translateApp(lang, 'common.alert'),
    ok: translateApp(lang, 'common.ok'),
    successTitle: translations.success,
    errorTitle: translateApp(lang, 'common.error'),
    warningTitle: translateApp(lang, 'common.warning'),
  });
  
  const location = useLocation();
  const project = useProject();
  const langConfig = useSiteLanguageConfig();
  const categoriesAndSkillsLoader = useCategoriesAndSkills();
  const { options: categoriesAndSkills } = useLocaleAwareTaxonomyOptions(
    categoriesAndSkillsLoader,
    $((loc) => fetchTaxonomyListOptions(null, loc).catch(() => ({ categories: [], skills: [] }))),
  );
  const updateAction = useUpdateProject();
  const lastSuccessId = useSignal<number | null>(null);
  const seoDraft = useSignal<ContentSeoDraft>(emptyContentSeoDraft());
  const seoMetasDraft = useSignal<ProjectSeoMeta[]>([]);

  // Normalize media objects to ensure consistent structure
  const normalizeMedia = (media: any) => {
    if (!media) return null;
    // Handle both API response format and local format
    const normalized = {
      ...media,
      id: media.id,
      name: media.name || media.fileName || media.file_name || '',
      url: media.url || media.thumbnailUrl || '',
      thumbnailUrl: media.thumbnailUrl || media.url || '',
      mime_type: media.mimeType || media.mime_type || media.file?.type || '',
      mimeType: media.mimeType || media.mime_type || media.file?.type || '',
      size: media.size || media.file?.size || 0,
      altText: media.altText || media.alt_text || media.getCustomProperty?.('alt_text') || '',
      file_name: media.file_name || media.fileName || media.name || '',
    };
    return normalized;
  };

  const heroMedia = useSignal<any>(normalizeMedia((project.value as any)?.media?.hero));
  const videoMedia = useSignal<any>(normalizeMedia((project.value as any)?.media?.video));
  const showHeroSelector = useSignal(false);
  const showVideoSelector = useSignal(false);
  const showPreview = useSignal(false);
  const savedProject = useSignal<any>(null);

  const categoryIds = useSignal<(string | number)[]>(
    project.value?.categories?.map((c: Category) => c.id) || []
  );
  const skillIds = useSignal<(string | number)[]>(
    project.value?.skills?.map((s: Skill) => s.id) || []
  );
  const statusValue = useSignal<string>(project.value.status || 'draft');
  const featuredValue = useSignal<boolean>(!!project.value.featured);
  const contentLocaleDraft = useSignal<string>(
    project.value.content_locale != null && String(project.value.content_locale).trim() !== ''
      ? String(project.value.content_locale).trim()
      : '',
  );
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const titleField = useSignal('');
  const slugField = useSignal('');
  const summaryField = useSignal('');
  const descriptionField = useSignal('');

  const projectSlugAuto = useContentSlugAutosuggestTitleSlugSignals({
    entity: 'projects',
    title: titleField,
    slug: slugField,
    ignoreRecordId: Number(location.params.id),
  });

  useTask$(({ track }) => {
    track(() => project.value?.id);
    if (project.value?.id != null) {
      slugField.value = project.value.slug || '';
      projectSlugAuto.slugLocked.value = false;
    }
  });

  useTask$(({ track }) => {
    track(() => project.value);
    track(() => editingLocaleDraft.value);
    track(() => langConfig.value.default_locale);
    track(() => langConfig.value.site_languages);
    track(() => contentLocaleDraft.value);
    if (!project.value || typeof project.value !== 'object') {
      return;
    }
    const m = mergeProjectFieldsForUiLocale(
      project.value as Project,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    titleField.value = m.title;
    summaryField.value = m.summary;
    descriptionField.value = m.description;
  });

  useTask$(({ track }) => {
    track(() => project.value?.id);
    const p = project.value as unknown as Project & { seo_metas?: ProjectSeoMeta[] };
    const rows = Array.isArray(p?.seoMetas) ? p.seoMetas : Array.isArray(p?.seo_metas) ? p.seo_metas : [];
    seoMetasDraft.value = rows.map((r) => ({
      id: typeof r.id === 'number' ? r.id : undefined,
      locale: String(r.locale ?? '').toLowerCase().trim(),
      meta_title: r.meta_title ?? '',
      meta_description: r.meta_description ?? '',
      canonical_url: r.canonical_url,
      og_title: r.og_title,
      og_description: r.og_description,
      og_image: r.og_image,
      twitter_card: r.twitter_card,
      schema: r.schema,
    }));
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.default_locale);
    track(() => langConfig.value.site_languages);
    track(() => seoMetasDraft.value);
    const loc = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    ).toLowerCase();
    const row = seoMetasDraft.value.find((r) => String(r.locale).toLowerCase() === loc);
    seoDraft.value = contentSeoDraftFromRow(row);
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => titleField.value);
    track(() => summaryField.value);
    track(() => descriptionField.value);
    track(() => heroMedia.value);
    const hm = heroMedia.value as Record<string, unknown> | null;
    const imageUrl =
      hm && typeof hm === 'object'
        ? String((hm.url as string) || (hm.thumbnailUrl as string) || (hm.preview as string) || '').trim()
        : '';
    const prev = untrack(() => seoDraft.value);
    seoDraft.value = mergeContentSeoDraftFromContent(prev, {
      title: titleField.value,
      descriptionCandidates: [summaryField.value, descriptionField.value],
      imageUrl: imageUrl || undefined,
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
  const projectTranslationsJson = initialTranslationsJson(
    'project',
    translationSecondaries,
    project.value?.translations,
  );

  if (!project.value) {
    return (
      <div class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`${translations.edit} #${location.params.id}`}
        description={translations.subtitle}
      >
        <div class="flex gap-2">
          <Link
            href={R.ADMIN.PROJECTS}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translations.back}
          </Link>
        </div>
      </PageHeader>

      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <Form 
          action={updateAction} 
          class="space-y-6"
        >
          {/* Hidden: map saves back to primary columns vs translation rows when dashboard language ≠ primary */}
          <input
            type="hidden"
            name="editing_locale"
            value={normalizeEditingLocale(
              editingLocaleDraft.value,
              langConfig.value.site_languages,
              langConfig.value.default_locale,
              contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
            )}
          />
          <input type="hidden" name="form_site_default_locale" value={langConfig.value.default_locale} />
          <input
            type="hidden"
            name="effective_primary_locale"
            value={primaryLocaleForContent(
              langConfig.value.site_languages,
              langConfig.value.default_locale,
              contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
            )}
          />
          <input type="hidden" name="canonical_title" value={(project.value as Project).title ?? ''} />
          <input type="hidden" name="canonical_summary" value={(project.value as Project).summary ?? ''} />
          <input type="hidden" name="canonical_description" value={(project.value as Project).description ?? ''} />
          <input
            type="hidden"
            name="seo_locale"
            value={normalizeEditingLocale(
              editingLocaleDraft.value,
              langConfig.value.site_languages,
              langConfig.value.default_locale,
              contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
            )}
          />
          <input type="hidden" name="seo_draft_json" value={JSON.stringify(seoDraft.value)} />
          <div class="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div class="space-y-6">
              <div class="grid gap-4 md:grid-cols-2">
                <TranslationsFormRoot
                  kind="project"
                  locales={translationSecondaries}
                  initialJson={projectTranslationsJson}
                  rtlBadge={translations.ctRtl}
                  fallbackHintShort={translations.ctFallbackHint}
                >
                  <ContentEditingLanguageSelect
                    siteLanguages={langConfig.value.site_languages}
                    value={editingLocaleDraft.value}
                    effectivePrimaryLocale={primaryLocaleForContent(
                      langConfig.value.site_languages,
                      langConfig.value.default_locale,
                      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
                    )}
                    label={translations.ctSection}
                    hintPrimary={translations.ctHint}
                    hintSecondary={translations.ctFallbackHint}
                    secondarySavePrefix={translations.ctAdd}
                    onChange$={$((code: string) => {
                      editingLocaleDraft.value = code;
                    })}
                  />

                  <EditingLocaleFieldsShell
                    variant="gridContents"
                    siteLanguages={langConfig.value.site_languages}
                    editingLocale={editingLocaleDraft}
                  >
                  {!translationSecondaries.length ? (
                    <p class="md:col-span-2 text-sm text-gray-600 dark:text-gray-400">{translations.ctNoLangs}</p>
                  ) : null}

                  <div>
                    <label
                      for="title"
                      class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.name} *
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={titleField.value}
                      onInput$={(e) => {
                        titleField.value = (e.target as HTMLInputElement).value;
                      }}
                      onBlur$={projectSlugAuto.onTitleBlurSuggestSlug$}
                      required
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                    />
                    {updateAction.value?.failed && updateAction.value.fieldErrors?.title && (
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {updateAction.value.fieldErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      for="slug"
                      class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.slug}
                    </label>
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      value={slugField.value}
                      onInput$={$((e) => {
                        projectSlugAuto.slugLocked.value = true;
                        slugField.value = (e.target as HTMLInputElement).value;
                      })}
                      onBlur$={projectSlugAuto.onSlugBlurEnsureUnique$}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                    />
                    <AdminPublicPageLink lang={lang} kind="projects" slug={slugField.value} />
                  </div>

                  <div class="md:col-span-2">
                    <label
                      for="summary"
                      class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.summary}
                    </label>
                    <textarea
                      id="summary"
                      name="summary"
                      rows={2}
                      value={summaryField.value}
                      onInput$={(e) => {
                        summaryField.value = (e.target as HTMLTextAreaElement).value;
                      }}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                    />
                  </div>

                  <div class="md:col-span-2">
                    <label
                      for="description"
                      class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.description}
                    </label>
                    <RichTextEditorField
                      id="description"
                      name="description"
                      value={descriptionField.value}
                      onValueChange$={(value) => {
                        descriptionField.value = value;
                      }}
                    />
                  </div>
                  </EditingLocaleFieldsShell>
                </TranslationsFormRoot>

                <EditingLocaleFieldsShell
                  variant="gridContents"
                  siteLanguages={langConfig.value.site_languages}
                  editingLocale={editingLocaleDraft}
                >
                <div>
                  <label
                    for="link_url"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translations.linkUrl}
                  </label>
                  <input
                    id="link_url"
                    name="link_url"
                    type="url"
                    value={project.value.link_url || ''}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {updateAction.value?.failed && updateAction.value.fieldErrors?.link_url && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {updateAction.value.fieldErrors.link_url}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    for="repo_url"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translations.repoUrl}
                  </label>
                  <input
                    id="repo_url"
                    name="repo_url"
                    type="url"
                    value={project.value.repo_url || ''}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {updateAction.value?.failed && updateAction.value.fieldErrors?.repo_url && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {updateAction.value.fieldErrors.repo_url}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    for="demo_url"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translations.demoUrl}
                  </label>
                  <input
                    id="demo_url"
                    name="demo_url"
                    type="url"
                    value={project.value.demo_url || ''}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                  {updateAction.value?.failed && updateAction.value.fieldErrors?.demo_url && (
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {updateAction.value.fieldErrors.demo_url}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    for="published_at"
                    class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {translations.publishedAt}
                  </label>
                  <input
                    id="published_at"
                    name="published_at"
                    type="datetime-local"
                    value={project.value.published_at ? new Date(project.value.published_at).toISOString().slice(0, 16) : ''}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                </EditingLocaleFieldsShell>
              </div>
            </div>

            <div class="space-y-6">
              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {translations.status}
                </h3>
                <div class="space-y-3">
                  <div>
                    <label
                      for="status"
                      class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.status}
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={statusValue.value}
                      onChange$={(e: Event) => {
                        statusValue.value = (e.target as HTMLSelectElement).value;
                      }}
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                    >
                      <option value="draft">{translations.statusDraft}</option>
                      <option value="published">{translations.statusPublished}</option>
                      <option value="archived">{translations.statusArchived}</option>
                    </select>
                  </div>

                  <div class="flex items-center gap-2">
                    <input
                      id="featured"
                      name="featured"
                      type="checkbox"
                      checked={featuredValue.value}
                      onChange$={(e: Event) => {
                        featuredValue.value = (e.target as HTMLInputElement).checked;
                      }}
                      value="1"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      for="featured"
                      class="text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      {translations.featured}
                    </label>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {translations.categories}
                </h3>
                <TagInput
                  value={categoryIds.value}
                  items={categoryItems}
                  placeholder={translations.searchCategories}
                  noResultsText={translations.noCategoriesFound}
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

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {translations.skills}
                </h3>
                <TagInput
                  value={skillIds.value}
                  items={skillItems}
                  placeholder={translations.searchSkills}
                  noResultsText={translations.noSkillsFound}
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

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {translations.seoTitle}
                </h3>
                {/* <!-- SEO applies to the locale selected above --> */}
                <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translations.seoForEditingLocale}</p>
                <ContentSeoFields lang={lang} idPrefix="project" draft={seoDraft} />
              </div>

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Hero Image</h3>
                {heroMedia.value ? (
                  <div class="mb-3 flex items-center gap-3">
                    {heroMedia.value.url ? (
                      <img
                        src={heroMedia.value.url}
                        alt={heroMedia.value.alt_text || heroMedia.value.name || ''}
                        width="96"
                        height="96"
                        class="h-24 w-24 rounded-lg border border-gray-300 object-cover dark:border-gray-700"
                      />
                    ) : heroMedia.value.file ? (
                      <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
                        <img
                          src={heroMedia.value.preview || ''}
                          alt={heroMedia.value.file?.name || ''}
                          width="96"
                          height="96"
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
                        - {heroMedia.value.mime_type || heroMedia.value.mimeType || heroMedia.value.file?.type || ''}
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
                <div class="flex flex-wrap gap-2">
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

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 class="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Video</h3>
                {videoMedia.value ? (
                  <div class="mb-3">
                    <div class="mb-3 flex items-center gap-3">
                      {videoMedia.value.url ? (
                        <div class="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
                          <video 
                            src={videoMedia.value.url} 
                            class="h-full w-full object-cover" 
                            muted
                            preload="metadata"
                            onError$={(e: any) => {
                              console.warn('Video load error:', e);
                            }}
                          />
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
                          - {videoMedia.value.mime_type || videoMedia.value.mimeType || videoMedia.value.file?.type || ''}
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
                        <video 
                          src={videoMedia.value.url} 
                          controls 
                          class="w-full max-w-2xl"
                          preload="metadata"
                          onError$={(e: any) => {
                            console.warn('Video playback error:', e);
                          }}
                        >
                          <source src={videoMedia.value.url} type={videoMedia.value.mime_type || videoMedia.value.mimeType || 'video/mp4'} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>
                ) : (
                  <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">No video selected.</div>
                )}
                <div class="flex flex-wrap gap-2">
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
            </div>
          </div>

          {updateAction.value?.failed && (updateAction.value as any).error && (
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              {(updateAction.value as any).error}
            </div>
          )}

          <div class="flex justify-end gap-2">
            <Link
              href={R.ADMIN.PROJECTS}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translations.back}
            </Link>
            <button
              type="button"
              disabled={updateAction.isRunning}
              onClick$={async (e) => {
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
                  const response = await updateAction.submit(formData as any);
                  const actionValue = (response as any)?.value as
                    | { success?: boolean; projectId?: number; error?: string; failed?: boolean }
                    | null;
                  if (actionValue && actionValue.success === true && actionValue.projectId) {
                    const loc = normalizeEditingLocale(
                      editingLocaleDraft.value,
                      langConfig.value.site_languages,
                      langConfig.value.default_locale,
                      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
                    ).toLowerCase();
                    const merged = seoDraftToMetaRow(loc, seoDraft.value);
                    const next = [...seoMetasDraft.value];
                    const idx = next.findIndex((r) => String(r.locale).toLowerCase() === loc);
                    if (idx >= 0) {
                      next[idx] = { ...next[idx], ...merged };
                    } else {
                      next.push(merged);
                    }
                    seoMetasDraft.value = next;
                    // Only show success if it's a new save
                    if (lastSuccessId.value !== actionValue.projectId) {
                      lastSuccessId.value = actionValue.projectId;
                      success(translations.success, {
                        text: translations.updated,
                      });
                    }
                  } else if (actionValue && (actionValue.error || actionValue.failed)) {
                    showError(translations.error, {
                      text: actionValue.error || 'Failed to update project',
                    });
                  }
                }
              }}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {updateAction.isRunning ? translations.loading : translations.save}
            </button>
          </div>
        </Form>

        {/* Media Selectors as Modals */}
        {showHeroSelector.value && (
          <MediaSelector
            title={translations.selectMedia || 'Select Hero Image'}
            accept="image/*"
            callback="hero"
            onSelect={$((media: Media) => {
              // Normalize Media object to match expected structure
              // Spread media first, then override with normalized values
              heroMedia.value = {
                ...media,
                id: media.id,
                name: media.name,
                url: media.url || media.thumbnailUrl || '',
                thumbnailUrl: media.thumbnailUrl,
                mime_type: media.mimeType || (media as any).mime_type || '',
                size: media.size || 0,
                altText: media.altText || (media as any).alt_text || '',
              };
              showHeroSelector.value = false;
            })}
            onClose={$(() => {
              showHeroSelector.value = false;
            })}
          />
        )}

        {showVideoSelector.value && (
          <MediaSelector
            title={translations.selectMedia || 'Select Video'}
            accept="video/*"
            callback="video"
            onSelect={$((media: Media) => {
              // Normalize Media object to match expected structure
              // Spread media first, then override with normalized values
              const normalized = {
                ...media,
                id: media.id,
                name: media.name,
                url: media.url || media.thumbnailUrl || '',
                thumbnailUrl: media.thumbnailUrl,
                mime_type: media.mimeType || (media as any).mime_type || '',
                size: media.size || 0,
                altText: media.altText || (media as any).alt_text || '',
              };
              videoMedia.value = normalized;
              showVideoSelector.value = false;
            })}
            onClose={$(() => {
              showVideoSelector.value = false;
            })}
          />
        )}

        {/* Preview Modal - Matching Vue Dashboard */}
        {showPreview.value && savedProject.value && (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick$={() => {
              showPreview.value = false;
              savedProject.value = null;
            }}
          >
            <div
              class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
              onClick$={(e) => e.stopPropagation()}
            >
              <div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {translations.preview || 'Project Preview'}
                  </h2>
                  <button
                    onClick$={() => {
                      showPreview.value = false;
                      savedProject.value = null;
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    {translations.close || 'Close'}
                  </button>
                </div>
              </div>

              <div class="p-6">
                <div class="space-y-6">
                  {/* Project Title */}
                  <div>
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {savedProject.value.title}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Slug: {savedProject.value.slug}
                    </p>
                  </div>

                  {/* Hero Image Preview */}
                  {savedProject.value.media?.hero && (
                    <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <img
                        src={
                          (savedProject.value.media.hero as any)?.url ||
                          (savedProject.value.media.hero as any)?.getUrl?.() ||
                          ''
                        }
                        alt={
                          (savedProject.value.media.hero as any)?.alt_text ||
                          savedProject.value.title
                        }
                        width="800"
                        height="256"
                        class="w-full h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Project Details */}
                  <div class="grid gap-4 md:grid-cols-2">
                    <div>
                      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {translations.status}
                      </p>
                      <p class="text-gray-900 dark:text-gray-100">{savedProject.value.status}</p>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {translations.featured}
                      </p>
                      <p class="text-gray-900 dark:text-gray-100">
                        {savedProject.value.featured ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {savedProject.value.link_url && (
                      <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {translations.linkUrl}
                        </p>
                        <a
                          href={savedProject.value.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {savedProject.value.link_url}
                        </a>
                      </div>
                    )}
                    {savedProject.value.repo_url && (
                      <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {translations.repoUrl}
                        </p>
                        <a
                          href={savedProject.value.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {savedProject.value.repo_url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {savedProject.value.summary && (
                    <div>
                      <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {translations.summary}
                      </p>
                      <p class="text-gray-900 dark:text-gray-100">{savedProject.value.summary}</p>
                    </div>
                  )}

                  {/* Description */}
                  {savedProject.value.description && (
                    <div>
                      <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {translations.description}
                      </p>
                      <div
                        class="text-gray-900 dark:text-gray-100"
                        dangerouslySetInnerHTML={savedProject.value.description}
                      />
                    </div>
                  )}

                  {/* Video Preview */}
                  {savedProject.value.media?.video && (
                    <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <video
                        src={
                          (savedProject.value.media.video as any)?.url ||
                          (savedProject.value.media.video as any)?.getUrl?.() ||
                          ''
                        }
                        controls
                        class="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div class="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
                <div class="flex justify-end gap-2">
                  <button
                    onClick$={() => {
                      showPreview.value = false;
                      savedProject.value = null;
                    }}
                    class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                  >
                    {translations.done || 'Done'}
                  </button>
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
  title: 'Edit Project - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Edit project',
    },
  ],
};
