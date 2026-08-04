import { component$, useSignal, $, useVisibleTask$, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { PageSectionsEditor } from '../../../../../components/admin/pages/PageSectionsEditor';
import { MediaSelector } from '../../../../../components/common/MediaSelector';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';
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
import { collectAppearanceMediaIdsFromPageSections, ensurePageLayoutBands, findBlockInBands, updateBlockInBands } from '../../../../../lib/admin/page-layout';
import {
  isAppearanceFieldTranslatable,
  writeAppearanceSettingValue,
} from '../../../../../lib/admin/appearance-locale-settings';
import type { AppearanceRegistryEntry, PageSectionNode } from '../../../../../lib/marketing/appearance-types';
import type { AdminPage } from '../../../../../types/page';
import type { Media } from '../../../../../types/media';
import {
  mergeBlogPostFieldsForUiLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import {
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';
import {
  AdminContentLanguageFields,
  ADMIN_CONTENT_FIELDS_GRID_CLASS,
} from '../../../../../components/admin/AdminContentLanguageFields';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_SIDEBAR_CARD_CLASS,
  ADMIN_FORM_TEXTAREA_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';

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
  const sections = useSignal<PageSectionNode[]>(
    (page.sections as PageSectionNode[]) || [],
  );
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ blockId: string; key: string; accept?: string } | null>(null);
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
      const ids = collectAppearanceMediaIdsFromPageSections(sections.value);
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
        <Link href={R.ADMIN.PAGES} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <EditingLocaleFieldsShell
          siteLanguages={langConfig.value.site_languages || []}
          editingLocale={editingLocaleDraft}
        >
          <div class="space-y-6">
            <div class={ADMIN_FORM_CARD_CLASS}>
              <div class={ADMIN_CONTENT_FIELDS_GRID_CLASS}>
                <AdminContentLanguageFields
                  lang={lang}
                  siteLanguages={langConfig.value.site_languages || []}
                  defaultLocale={langConfig.value.default_locale || 'en'}
                  contentLocale={contentLocaleDraft}
                  editingLocale={editingLocaleDraft}
                />

                <div>
                  <label for="page-edit-title" class={ADMIN_FORM_LABEL_CLASS}>
                    {translateApp(lang, 'pages.fields.title')} *
                  </label>
                  <input
                    id="page-edit-title"
                    class={ADMIN_FORM_INPUT_CLASS}
                    value={formData.value.title}
                    onInput$={(e) => {
                      formData.value = { ...formData.value, title: (e.target as HTMLInputElement).value };
                    }}
                  />
                </div>
                <div>
                  <label for="page-edit-slug" class={ADMIN_FORM_LABEL_CLASS}>
                    {translateApp(lang, 'pages.fields.slug')}
                  </label>
                  <input
                    id="page-edit-slug"
                    class={`${ADMIN_FORM_INPUT_CLASS} font-mono text-xs`}
                    value={formData.value.slug}
                    onInput$={(e) => {
                      formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
                    }}
                  />
                  <AdminPublicPageLink lang={lang} kind="pages" slug={formData.value.slug} />
                </div>
                <div class="md:col-span-2">
                  <label for="page-edit-excerpt" class={ADMIN_FORM_LABEL_CLASS}>
                    {translateApp(lang, 'pages.fields.excerpt')}
                  </label>
                  <textarea
                    id="page-edit-excerpt"
                    class={ADMIN_FORM_TEXTAREA_CLASS}
                    rows={3}
                    value={formData.value.excerpt}
                    onInput$={(e) => {
                      formData.value = {
                        ...formData.value,
                        excerpt: (e.target as HTMLTextAreaElement).value,
                      };
                    }}
                  />
                </div>
              </div>
            </div>

            <div class={ADMIN_FORM_CARD_CLASS}>
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
                onPickMedia$={$((blockId, key, accept) => {
                  mediaTarget.value = { blockId, key, accept };
                })}
              />
            </div>
          </div>
        </EditingLocaleFieldsShell>

        <aside class="space-y-4 lg:sticky lg:top-24">
          <div class={ADMIN_FORM_SIDEBAR_CARD_CLASS}>
            <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'pages.publish')}
            </h3>
            <div class="space-y-3">
              <div>
                <label for="page-edit-status" class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'pages.fields.status')}
                </label>
                <select
                  id="page-edit-status"
                  class={ADMIN_NATIVE_SELECT_CLASS}
                  value={formData.value.status}
                  onChange$={(e) => {
                    formData.value = {
                      ...formData.value,
                      status: (e.target as HTMLSelectElement).value as 'draft' | 'published',
                    };
                  }}
                >
                  <option class={ADMIN_NATIVE_OPTION_CLASS} value="draft">
                    {translateApp(lang, 'pages.statusDraft')}
                  </option>
                  <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
                    {translateApp(lang, 'pages.statusPublished')}
                  </option>
                </select>
              </div>
              <div class="flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <button
                  type="button"
                  class={ADMIN_PRIMARY_BUTTON_CLASS}
                  disabled={saving.value}
                  onClick$={handleSave$}
                >
                  {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
                </button>
                <Link href={R.ADMIN.PAGES} class={`${ADMIN_BACK_BUTTON_CLASS} text-center`}>
                  {translateApp(lang, 'common.cancel')}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

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
            const bands = ensurePageLayoutBands(sections.value);
            const block = findBlockInBands(bands, target.blockId);
            const entry = registry.value.find((r) => r.type === block?.type);
            const field = entry?.settings_fields?.find((f) => f.key === target.key);
            const translatable = field ? isAppearanceFieldTranslatable(field) : false;
            sections.value = updateBlockInBands(bands, target.blockId, (blk) => ({
              ...blk,
              settings: writeAppearanceSettingValue(
                blk.settings ?? {},
                target.key,
                media.id,
                activeSettingsLocale.value,
                langConfig.value.default_locale || 'en',
                translatable,
              ),
            }));
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
  title: 'Edit Page - Dashboard',
  meta: [{ name: 'description', content: 'Edit a marketing CMS page' }],
};
