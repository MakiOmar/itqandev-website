import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import {
  AdminContentLanguageFields,
  ADMIN_CONTENT_FIELDS_GRID_CLASS,
} from '../../../../../components/admin/AdminContentLanguageFields';
import { EditingLocaleFieldsShell } from '../../../../../components/admin/PerFieldContentTranslations';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { runFormUpdateFromBrowser } from '../../../../../lib/admin/form-actions';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import {
  adminFormBuilderHref,
  adminFormSubmissionsHref,
  useAppRoutes,
} from '../../../../../lib/constants/routes';
import type { AdminForm } from '../../../../../types/form';
import {
  mergeBlogPostFieldsForUiLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import {
  suggestUniqueContentSlug,
  useContentSlugAutosuggestTitleSlugSignals,
} from '../../../../../lib/slug/content-slug-auto';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_SIDEBAR_CARD_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '../../../../../lib/admin/native-select-classes';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';

function mapFormFromApi(raw: Record<string, unknown>): AdminForm {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    layout: (raw.layout as AdminForm['layout']) ?? { rows: [] },
    actions: Array.isArray(raw.actions) ? (raw.actions as AdminForm['actions']) : [],
    settings: (raw.settings as AdminForm['settings']) ?? {},
    translations: Array.isArray(raw.translations)
      ? (raw.translations as AdminForm['translations'])
      : [],
    submissions_count: Number(raw.submissions_count ?? 0),
    createdAt: (raw.created_at as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? '',
  };
}

export const useFormEditor = routeLoader$(async ({ params, cookie, request, fail }) => {
  // Keep /forms/new as the dedicated create route (same guard as pages).
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.FORMS.GET(id));
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return mapFormFromApi(body);
  } catch {
    return fail(404, { message: 'Form not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const formLoader = useFormEditor();
  const form = formLoader.value as AdminForm;

  const title = useSignal(form.title);
  const slug = useSignal(form.slug);
  const status = useSignal<'draft' | 'published'>(
    form.status === 'published' ? 'published' : 'draft',
  );
  const contentLocaleDraft = useSignal(form.content_locale || '');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalTitle = useSignal(form.title);
  const translationsJson = useSignal(JSON.stringify(form.translations || []));
  const saving = useSignal(false);

  const slugAuto = useContentSlugAutosuggestTitleSlugSignals({
    entity: 'forms',
    title,
    slug,
    ignoreRecordId: form.id,
  });

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
        excerpt: '',
        content: '',
        content_locale: contentLocaleDraft.value || null,
        translations: JSON.parse(translationsJson.value || '[]'),
      } as any,
      editingLocaleDraft.value || primary,
      langConfig.value.site_languages,
      siteDef,
      contentLocaleDraft.value.trim() || null,
    );
    title.value = merged.title;
  });

  const handleSave$ = $(async () => {
    if (!title.value.trim()) {
      await showError(translateApp(lang, 'forms.titleRequired'));
      return;
    }
    saving.value = true;
    try {
      let nextSlug = slug.value.trim();
      if (!nextSlug) {
        nextSlug = (await suggestUniqueContentSlug('forms', title.value, { ignoreId: form.id })) || '';
        slug.value = nextSlug;
      }
      if (!nextSlug) {
        await showError(translateApp(lang, 'forms.slugRequired'));
        return;
      }
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        contentLocaleDraft.value.trim() || null,
      );
      const editingLocale = editingLocaleDraft.value || effectivePrimary;
      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        canonicalTitle.value = title.value;
      }
      const result = await runFormUpdateFromBrowser(form.id, {
        title: title.value,
        slug: nextSlug,
        status: status.value,
        content_locale: contentLocaleDraft.value,
        editing_locale: editingLocale,
        effective_primary_locale: effectivePrimary,
        canonical_title: canonicalTitle.value,
        layout_json: JSON.stringify(form.layout ?? { rows: [] }),
        actions_json: JSON.stringify(form.actions ?? []),
        settings_json: JSON.stringify(form.settings ?? {}),
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
      <PageHeader title={translateApp(lang, 'forms.edit')} description={form.slug}>
        <div class="flex flex-wrap gap-2">
          <Link href={adminFormBuilderHref(lang, form.id)} class={ADMIN_PRIMARY_BUTTON_CLASS}>
            {translateApp(lang, 'forms.openBuilder')}
          </Link>
          <Link href={adminFormSubmissionsHref(lang, form.id)} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'forms.submissions')}
          </Link>
          <Link href={R.ADMIN.FORMS} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'common.back')}
          </Link>
        </div>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <EditingLocaleFieldsShell
          siteLanguages={langConfig.value.site_languages || []}
          editingLocale={editingLocaleDraft}
        >
          <div class={`${ADMIN_FORM_CARD_CLASS} space-y-4 p-4`}>
            <div class={ADMIN_CONTENT_FIELDS_GRID_CLASS}>
              <AdminContentLanguageFields
                lang={lang}
                siteLanguages={langConfig.value.site_languages || []}
                defaultLocale={langConfig.value.default_locale || 'en'}
                contentLocale={contentLocaleDraft}
                editingLocale={editingLocaleDraft}
              />
              <label class={ADMIN_FORM_LABEL_CLASS}>
                {translateApp(lang, 'forms.fields.title')}
                <input
                  class={ADMIN_FORM_INPUT_CLASS}
                  bind:value={title}
                  onBlur$={slugAuto.onTitleBlurSuggestSlug$}
                />
              </label>
              <div>
                <label class={ADMIN_FORM_LABEL_CLASS}>
                  {translateApp(lang, 'forms.fields.slug')}
                  <input
                    class={`${ADMIN_FORM_INPUT_CLASS} font-mono text-xs`}
                    bind:value={slug}
                    onInput$={slugAuto.onSlugInputLocksAutoFromTitle$}
                    onBlur$={slugAuto.onSlugBlurEnsureUnique$}
                  />
                </label>
                <AdminPublicPageLink lang={lang} kind="forms" slug={slug.value} />
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {translateApp(lang, 'forms.builderModeHint')}
            </p>
            <div class="flex flex-wrap gap-2">
              <Link
                href={adminFormBuilderHref(lang, form.id)}
                class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
              >
                {translateApp(lang, 'forms.openBuilder')}
              </Link>
              <Link
                href={adminFormSubmissionsHref(lang, form.id)}
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
              >
                {translateApp(lang, 'forms.viewSubmissions')} (
                {form.submissions_count ?? 0})
              </Link>
            </div>
          </div>
        </EditingLocaleFieldsShell>

        <aside class="space-y-4 lg:sticky lg:top-24">
          <div class={ADMIN_FORM_SIDEBAR_CARD_CLASS}>
            <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {translateApp(lang, 'forms.publish')}
            </h3>
            <div class="space-y-3">
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
              <div class="flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <button
                  type="button"
                  class={ADMIN_PRIMARY_BUTTON_CLASS}
                  disabled={saving.value}
                  onClick$={handleSave$}
                >
                  {saving.value
                    ? translateApp(lang, 'common.loading')
                    : translateApp(lang, 'common.save')}
                </button>
                <Link href={R.ADMIN.FORMS} class={`${ADMIN_BACK_BUTTON_CLASS} text-center`}>
                  {translateApp(lang, 'common.cancel')}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ params }) => ({
  title: translateApp(String(params.lang || 'en'), 'forms.edit'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
