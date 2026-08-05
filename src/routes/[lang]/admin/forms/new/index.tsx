import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import {
  AdminContentLanguageFields,
  ADMIN_CONTENT_FIELDS_GRID_CLASS,
} from '../../../../../components/admin/AdminContentLanguageFields';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { runFormCreateFromBrowser } from '../../../../../lib/admin/form-actions';
import { adminFormBuilderHref, useAppRoutes } from '../../../../../lib/constants/routes';
import {
  suggestUniqueContentSlug,
  useContentSlugAutosuggestTitleSlugSignals,
} from '../../../../../lib/slug/content-slug-auto';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const nav = useNavigate();
  const { success, error: showError } = useSwal();
  const siteMeta = usePublicSiteMeta();
  const siteLanguages = siteMeta.value?.site_languages ?? [];
  const defaultLocale = String(siteMeta.value?.default_locale || 'en');
  const title = useSignal('');
  const slug = useSignal('');
  const status = useSignal<'draft' | 'published'>('draft');
  const contentLocale = useSignal(defaultLocale);
  const editingLocale = useSignal(defaultLocale);
  const saving = useSignal(false);
  const slugAuto = useContentSlugAutosuggestTitleSlugSignals({
    entity: 'forms',
    title,
    slug,
  });

  const onSave$ = $(async () => {
    if (!title.value.trim()) {
      await showError(translateApp(lang, 'forms.titleRequired'));
      return;
    }
    saving.value = true;
    try {
      let nextSlug = slug.value.trim();
      if (!nextSlug) {
        nextSlug = (await suggestUniqueContentSlug('forms', title.value)) || '';
        slug.value = nextSlug;
      }
      if (!nextSlug) {
        await showError(translateApp(lang, 'forms.slugRequired'));
        return;
      }
      const result = await runFormCreateFromBrowser({
        title: title.value,
        slug: nextSlug,
        status: status.value,
        content_locale: contentLocale.value,
        editing_locale: editingLocale.value,
        effective_primary_locale: contentLocale.value || defaultLocale,
      });
      if (!result.success || !result.id) {
        await showError(result.error || translateApp(lang, 'common.error'));
        return;
      }
      await success(translateApp(lang, 'common.created'));
      await nav(adminFormBuilderHref(lang, result.id));
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, 'forms.create')}>
        <Link href={R.ADMIN.FORMS} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>
      <div class={`${ADMIN_FORM_CARD_CLASS} space-y-4 p-4`}>
        <div class={ADMIN_CONTENT_FIELDS_GRID_CLASS}>
          <AdminContentLanguageFields
            lang={lang}
            contentLocale={contentLocale}
            editingLocale={editingLocale}
            siteLanguages={siteLanguages}
            defaultLocale={defaultLocale}
          />
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(lang, 'forms.fields.title')}
            <input
              class={ADMIN_FORM_INPUT_CLASS}
              bind:value={title}
              onBlur$={slugAuto.onTitleBlurSuggestSlug$}
            />
          </label>
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(lang, 'forms.fields.slug')}
            <input
              class={ADMIN_FORM_INPUT_CLASS}
              bind:value={slug}
              onInput$={slugAuto.onSlugInputLocksAutoFromTitle$}
              onBlur$={slugAuto.onSlugBlurEnsureUnique$}
            />
          </label>
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(lang, 'forms.fields.status')}
            <select class={ADMIN_NATIVE_SELECT_CLASS} bind:value={status}>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="draft">
                {translateApp(lang, 'forms.statusDraft')}
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="published">
                {translateApp(lang, 'forms.statusPublished')}
              </option>
            </select>
          </label>
        </div>
        <p class="text-xs text-gray-500">{translateApp(lang, 'forms.builderAfterSaveHint')}</p>
        <button
          type="button"
          class={ADMIN_PRIMARY_BUTTON_CLASS}
          disabled={saving.value}
          onClick$={onSave$}
        >
          {saving.value
            ? translateApp(lang, 'common.loading')
            : translateApp(lang, 'common.save')}
        </button>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ params }) => ({
  title: translateApp(String(params.lang || 'en'), 'forms.create'),
});
