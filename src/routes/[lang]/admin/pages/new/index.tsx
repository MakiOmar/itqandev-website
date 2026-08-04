import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { PageSectionsEditor } from '../../../../../components/admin/pages/PageSectionsEditor';
import { MediaSelector } from '../../../../../components/common/MediaSelector';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { useCreatePage } from '../../../../../lib/admin/page-actions';
import { submitRouteActionFormData } from '../../../../../lib/admin/route-action-form-submit';
import { adminPageEditHref, useAppRoutes } from '../../../../../lib/constants/routes';
import { useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';
import {
  fetchAppearanceRegistriesFromBrowser,
} from '../../../../../lib/admin/appearance-actions';
import { writeAppearanceSettingValue } from '../../../../../lib/admin/appearance-locale-settings';
import type { AppearanceRegistryEntry, HomepageSectionInstance } from '../../../../../lib/marketing/appearance-types';
import type { Media } from '../../../../../types/media';
import { primaryLocaleForContent } from '../../../../../lib/content-display-locale';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '../../../../../lib/admin/native-select-classes';

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const langConfig = usePublicSiteMeta();
  const createAction = useCreatePage();

  const formData = useSignal({
    title: '',
    slug: '',
    excerpt: '',
    status: 'draft' as 'draft' | 'published',
  });
  const contentLocaleDraft = useSignal('');
  const sections = useSignal<HomepageSectionInstance[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const mediaPreviewById = useSignal<Record<string, string>>({});
  const mediaTarget = useSignal<{ sectionId: string; key: string; accept?: string } | null>(null);
  const activeSettingsLocale = useSignal(langConfig.value.default_locale || 'en');
  const saving = useSignal(false);

  const pageSlugAuto = useContentSlugAutosuggestForm('pages', formData, 'title');

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      registry.value = regs.homepage_sections ?? [];
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
      const result = await submitRouteActionFormData(createAction, {
        title: formData.value.title,
        slug: formData.value.slug,
        excerpt: formData.value.excerpt,
        status: formData.value.status,
        content_locale: contentLocaleDraft.value,
        editing_locale: effectivePrimary,
        effective_primary_locale: effectivePrimary,
        canonical_title: formData.value.title,
        canonical_excerpt: formData.value.excerpt,
        sections_json: JSON.stringify(sections.value),
        translations_json: '[]',
      });
      const id = (result as { id?: number })?.id;
      if ((result as { success?: boolean })?.success && id) {
        await success(translateApp(lang, 'common.created'));
        await navigate(adminPageEditHref(lang, id));
      } else {
        await showError(
          String((result as { message?: string })?.message || translateApp(lang, 'common.error')),
        );
      }
    } finally {
      saving.value = false;
    }
  });

  return (
    <div>
      <PageHeader title={translateApp(lang, 'pages.addNew')} description={translateApp(lang, 'pages.subtitle')}>
        <Link href={R.ADMIN.PAGES} class="text-sm text-primary-600 hover:underline">
          {translateApp(lang, 'pages.list')}
        </Link>
      </PageHeader>

      <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div>
          <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.title')}</label>
          <input
            class="w-full rounded border px-3 py-2 text-sm dark:bg-gray-950"
            value={formData.value.title}
            onInput$={(e) => {
              formData.value = { ...formData.value, title: (e.target as HTMLInputElement).value };
            }}
            onBlur$={pageSlugAuto.onTitleBlurSuggestSlug$}
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.slug')}</label>
          <input
            class="w-full rounded border px-3 py-2 text-sm font-mono dark:bg-gray-950"
            value={formData.value.slug}
            onInput$={(e) => {
              pageSlugAuto.slugLocked.value = true;
              formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
            }}
            onBlur$={pageSlugAuto.onSlugBlurEnsureUnique$}
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium">{translateApp(lang, 'pages.fields.excerpt')}</label>
          <textarea
            class="w-full rounded border px-3 py-2 text-sm dark:bg-gray-950"
            rows={2}
            value={formData.value.excerpt}
            onInput$={(e) => {
              formData.value = { ...formData.value, excerpt: (e.target as HTMLTextAreaElement).value };
            }}
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
            {translateApp(lang, 'pages.fields.status')}
          </label>
          <select
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
            const next = sections.value.map((section) => {
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
            sections.value = next;
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
  title: 'New page',
};
