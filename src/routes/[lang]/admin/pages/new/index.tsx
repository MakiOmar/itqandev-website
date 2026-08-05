import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { PageSectionsEditor } from '../../../../../components/admin/pages/PageSectionsEditor';
import { MediaSelector } from '../../../../../components/common/MediaSelector';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';
import {
  AdminContentLanguageFields,
  ADMIN_CONTENT_FIELDS_GRID_CLASS,
} from '../../../../../components/admin/AdminContentLanguageFields';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { runPageCreateFromBrowser } from '../../../../../lib/admin/page-actions';
import { adminPageBuilderHref, useAppRoutes } from '../../../../../lib/constants/routes';
import {
  suggestUniqueContentSlug,
  useContentSlugAutosuggestForm,
} from '../../../../../lib/slug/content-slug-auto';
import { fetchAppearanceRegistriesFromBrowser } from '../../../../../lib/admin/appearance-actions';
import { writeAppearanceSettingValue, isAppearanceFieldTranslatable } from '../../../../../lib/admin/appearance-locale-settings';
import {
  ensurePageLayoutBands,
  findBlockInBands,
  updateBlockInBands,
} from '../../../../../lib/admin/page-layout';
import type { AppearanceRegistryEntry, PageSectionNode } from '../../../../../lib/marketing/appearance-types';
import type { Media } from '../../../../../types/media';
import { primaryLocaleForContent } from '../../../../../lib/content-display-locale';
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

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const langConfig = usePublicSiteMeta();

  const formData = useSignal({
    title: '',
    slug: '',
    excerpt: '',
    status: 'draft' as 'draft' | 'published',
  });
  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ blockId: string; key: string; accept?: string } | null>(null);
  const activeSettingsLocale = useSignal(langConfig.value.default_locale || 'en');
  const saving = useSignal(false);

  const pageSlugAuto = useContentSlugAutosuggestForm('pages', formData, 'title');

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? regs.homepage_sections ?? [])];
    } catch {
      registry.value = [];
    }
  });

  const handleSave$ = $(async () => {
    const title = formData.value.title.trim();
    if (!title) {
      await showError(translateApp(lang, 'pages.titleRequired'));
      return;
    }
    saving.value = true;
    try {
      let slug = formData.value.slug.trim();
      if (!slug) {
        slug = (await suggestUniqueContentSlug('pages', title)) || '';
        if (slug) {
          formData.value = { ...formData.value, slug };
        }
      }
      if (!slug) {
        await showError(translateApp(lang, 'pages.slugRequired'));
        return;
      }

      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        contentLocaleDraft.value.trim() || null,
      );
      const result = await runPageCreateFromBrowser({
        title: formData.value.title,
        slug,
        excerpt: formData.value.excerpt,
        status: formData.value.status,
        content_locale: contentLocaleDraft.value,
        editing_locale: editingLocaleDraft.value || effectivePrimary,
        effective_primary_locale: effectivePrimary,
        canonical_title: formData.value.title,
        canonical_excerpt: formData.value.excerpt,
        sections_json: JSON.stringify(sections.value || []),
        persist_sections: true,
        translations_json: '[]',
      });
      if (result.success && result.id) {
        await success(translateApp(lang, 'common.created'));
        await navigate(adminPageBuilderHref(lang, result.id));
      } else {
        await showError(String(result.error || translateApp(lang, 'common.error')));
      }
    } catch (err) {
      await showError(
        err instanceof Error ? err.message : translateApp(lang, 'common.error'),
      );
    } finally {
      saving.value = false;
    }
  });

  return (
    <div>
      <PageHeader title={translateApp(lang, 'pages.addNew')} description={translateApp(lang, 'pages.subtitle')}>
        <Link href={R.ADMIN.PAGES} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      {/* WordPress-style: main content + sticky publish sidebar */}
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
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
                <label for="page-title" class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'pages.fields.title')} *
                </label>
                <input
                  id="page-title"
                  class={ADMIN_FORM_INPUT_CLASS}
                  value={formData.value.title}
                  placeholder={translateApp(lang, 'pages.titlePlaceholder')}
                  onInput$={(e) => {
                    formData.value = { ...formData.value, title: (e.target as HTMLInputElement).value };
                  }}
                  onBlur$={pageSlugAuto.onTitleBlurSuggestSlug$}
                />
              </div>

              <div>
                <label for="page-slug" class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'pages.fields.slug')}
                </label>
                <input
                  id="page-slug"
                  class={`${ADMIN_FORM_INPUT_CLASS} font-mono text-xs`}
                  value={formData.value.slug}
                  onInput$={(e) => {
                    pageSlugAuto.slugLocked.value = true;
                    formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
                  }}
                  onBlur$={pageSlugAuto.onSlugBlurEnsureUnique$}
                />
                <AdminPublicPageLink lang={lang} kind="pages" slug={formData.value.slug} />
              </div>

              <div class="md:col-span-2">
                <label for="page-excerpt" class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'pages.fields.excerpt')}
                </label>
                <textarea
                  id="page-excerpt"
                  class={ADMIN_FORM_TEXTAREA_CLASS}
                  rows={3}
                  value={formData.value.excerpt}
                  placeholder={translateApp(lang, 'pages.excerptPlaceholder')}
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
            <p class="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {translateApp(lang, 'pages.builderAfterSaveHint')}
            </p>
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

        <aside class="space-y-4 lg:sticky lg:top-24">
          <div class={ADMIN_FORM_SIDEBAR_CARD_CLASS}>
            <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'pages.publish')}
            </h3>
            <div class="space-y-3">
              <div>
                <label for="page-status" class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'pages.fields.status')}
                </label>
                <select
                  id="page-status"
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
  title: 'Create Page - Dashboard',
  meta: [{ name: 'description', content: 'Create a marketing CMS page' }],
};
