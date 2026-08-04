import { component$, useSignal, $, useVisibleTask$, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { PageSectionsEditor } from '../../../../../components/admin/pages/PageSectionsEditor';
import { MediaSelector } from '../../../../../components/common/MediaSelector';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { runPageUpdateFromBrowser } from '../../../../../lib/admin/page-actions';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import {
  fetchAppearanceRegistriesFromBrowser,
  hydrateAppearanceMediaPreviews,
} from '../../../../../lib/admin/appearance-actions';
import { collectAppearanceMediaIdsFromSections } from '../../../../../lib/admin/appearance-media-ref';
import { writeAppearanceSettingValue } from '../../../../../lib/admin/appearance-locale-settings';
import type { AppearanceRegistryEntry, HomepageSectionInstance } from '../../../../../lib/marketing/appearance-types';
import type { AdminPage } from '../../../../../types/page';
import type { Media } from '../../../../../types/media';
import {
  mergeBlogPostFieldsForUiLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';

function mapPageFromApi(raw: Record<string, unknown>): AdminPage {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    sections: Array.isArray(raw.sections) ? (raw.sections as HomepageSectionInstance[]) : [],
    translations: Array.isArray(raw.translations)
      ? (raw.translations as AdminPage['translations'])
      : [],
  };
}

export const usePageEditor = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.PAGES.GET(id));
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return mapPageFromApi(body);
  } catch {
    return fail(404, { message: 'Page not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const pageLoader = usePageEditor();
  const page = pageLoader.value as AdminPage;

  const formData = useSignal({
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt || '',
    status: (page.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
  });
  const contentLocaleDraft = useSignal(page.content_locale || '');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalTitle = useSignal(page.title);
  const canonicalExcerpt = useSignal(page.excerpt || '');
  const translationsJson = useSignal(JSON.stringify(page.translations || []));
  const sections = useSignal<HomepageSectionInstance[]>(
    (page.sections as HomepageSectionInstance[]) || [],
  );
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ sectionId: string; key: string; accept?: string } | null>(null);
  const activeSettingsLocale = useSignal(langConfig.value.default_locale || 'en');
  const saving = useSignal(false);

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.site_languages);
    const siteDef = langConfig.value.default_locale || 'en';
    const primary = primaryLocaleForContent(
      langConfig.value.site_languages,
      siteDef,
      contentLocaleDraft.value.trim() || null,
    );
    const merged = mergeBlogPostFieldsForUiLocale(
      {
        title: canonicalTitle.value,
        excerpt: canonicalExcerpt.value,
        content: '',
        content_locale: contentLocaleDraft.value || null,
        translations: JSON.parse(translationsJson.value || '[]'),
      } as any,
      editingLocaleDraft.value || primary,
      langConfig.value.site_languages,
      siteDef,
      contentLocaleDraft.value.trim() || null,
    );
    formData.value = {
      ...formData.value,
      title: merged.title,
      excerpt: merged.excerpt,
    };
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      registry.value = regs.homepage_sections ?? [];
      const ids = collectAppearanceMediaIdsFromSections(sections.value);
      mediaPreviewById.value = await hydrateAppearanceMediaPreviews(ids, mediaPreviewById.value);
    } catch {
      registry.value = [];
    }
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        contentLocaleDraft.value.trim() || null,
      );
      const editingLocale = editingLocaleDraft.value || effectivePrimary;
      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        canonicalTitle.value = formData.value.title;
        canonicalExcerpt.value = formData.value.excerpt;
      }
      const result = await runPageUpdateFromBrowser(page.id, {
        title: formData.value.title,
        slug: formData.value.slug,
        excerpt: formData.value.excerpt,
        status: formData.value.status,
        content_locale: contentLocaleDraft.value,
        editing_locale: editingLocale,
        effective_primary_locale: effectivePrimary,
        canonical_title: canonicalTitle.value,
        canonical_excerpt: canonicalExcerpt.value,
        sections_json: JSON.stringify(sections.value),
        translations_json: translationsJson.value,
      });
      if (result.success) {
        await success(translateApp(lang, 'common.updated'));
      } else {
        await showError(result.error || translateApp(lang, 'common.error'));
      }
    } finally {
      saving.value = false;
    }
  });

  return (
    <div>
      <PageHeader title={translateApp(lang, 'pages.edit')} description={page.slug}>
        <Link href={R.ADMIN.PAGES} class="text-sm text-primary-600 hover:underline">
          {translateApp(lang, 'pages.list')}
        </Link>
      </PageHeader>

      <div class="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <ContentPrimaryLanguageSelect
          siteLanguages={langConfig.value.site_languages || []}
          defaultLocale={langConfig.value.default_locale || 'en'}
          value={contentLocaleDraft.value}
          label={translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}
          hint={translateApp(lang, 'contentTranslations.contentPrimaryHint')}
          useSiteDefaultLabel={translateApp(lang, 'contentTranslations.useSiteDefault')}
          onChange$={$((code) => {
            contentLocaleDraft.value = code;
          })}
        />
        <ContentEditingLanguageSelect
          siteLanguages={langConfig.value.site_languages || []}
          value={editingLocaleDraft.value}
          label={translateApp(lang, 'contentTranslations.editingLanguage')}
          hintPrimary={translateApp(lang, 'contentTranslations.editingHintPrimary')}
          hintSecondary={translateApp(lang, 'contentTranslations.editingHintSecondary')}
          secondarySavePrefix={translateApp(lang, 'contentTranslations.secondarySavePrefix')}
          effectivePrimaryLocale={primaryLocaleForContent(
            langConfig.value.site_languages,
            langConfig.value.default_locale,
            contentLocaleDraft.value.trim() || null,
          )}
          onChange$={$((code) => {
            editingLocaleDraft.value = code;
          })}
        />
      </div>

      <EditingLocaleFieldsShell
        siteLanguages={langConfig.value.site_languages || []}
        editingLocale={editingLocaleDraft}
      >        <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.title')}</label>
            <input
              class="w-full rounded border px-3 py-2 text-sm dark:bg-gray-950"
              value={formData.value.title}
              onInput$={(e) => {
                formData.value = { ...formData.value, title: (e.target as HTMLInputElement).value };
              }}
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.slug')}</label>
            <input
              class="w-full rounded border px-3 py-2 text-sm font-mono dark:bg-gray-950"
              value={formData.value.slug}
              onInput$={(e) => {
                formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
              }}
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.excerpt')}</label>
            <textarea
              class="w-full rounded border px-3 py-2 text-sm dark:bg-gray-950"
              rows={2}
              value={formData.value.excerpt}
              onInput$={(e) => {
                formData.value = {
                  ...formData.value,
                  excerpt: (e.target as HTMLTextAreaElement).value,
                };
              }}
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.status')}</label>
            <select
              class="w-full rounded border px-3 py-2 text-sm dark:bg-gray-950"
              value={formData.value.status}
              onChange$={(e) => {
                formData.value = {
                  ...formData.value,
                  status: (e.target as HTMLSelectElement).value as 'draft' | 'published',
                };
              }}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>

          <PageSectionsEditor
            lang={lang}
            sections={sections.value}
            registry={registry.value}
            languages={langConfig.value.site_languages}
            defaultLocale={langConfig.value.default_locale}
            activeLocale={activeSettingsLocale.value}
            mediaPreviewById={mediaPreviewById.value}
            onLocaleChange$={$((code) => {
              activeSettingsLocale.value = code;
            })}
            onChange$={$((next) => {
              sections.value = next;
            })}
            onMediaPreview$={$((mediaId, url) => {
              mediaPreviewById.value = { ...mediaPreviewById.value, [String(mediaId)]: url };
            })}
            onPickMedia$={$((sectionId, key, accept) => {
              mediaTarget.value = { sectionId, key, accept };
            })}
          />

          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={saving.value}
            onClick$={handleSave$}
          >
            {translateApp(lang, 'common.save')}
          </button>
        </div>
      </EditingLocaleFieldsShell>

      {mediaTarget.value ? (
        <MediaSelector
          title={translateApp(lang, 'appearance.selectImage')}
          accept={mediaTarget.value.accept || 'image/*'}
          onSelect={$((media: Media) => {
            const target = mediaTarget.value;
            mediaTarget.value = null;
            if (!target || !media.id) return;
            const url = media.url || media.thumbnailUrl || '';
            if (url) {
              mediaPreviewById.value = { ...mediaPreviewById.value, [String(media.id)]: url };
            }
            sections.value = sections.value.map((section) => {
              if (section.id !== target.sectionId) return section;
              return {
                ...section,
                settings: writeAppearanceSettingValue(
                  section.settings ?? {},
                  target.key,
                  media.id,
                  activeSettingsLocale.value,
                  langConfig.value.default_locale || 'en',
                  true,
                ),
              };
            });
          })}
          onClose={$(() => {
            mediaTarget.value = null;
          })}
        />
      ) : null}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Edit page',
};
