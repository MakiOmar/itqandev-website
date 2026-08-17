import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';
import { PageHierarchyFields } from '../../../../../components/admin/pages/PageHierarchyFields';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { runPageUpdateFromBrowser } from '../../../../../lib/admin/page-actions';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import {
  adminPageBuilderHref,
  useAppRoutes,
} from '../../../../../lib/constants/routes';
import type { PageSectionNode } from '../../../../../lib/marketing/appearance-types';
import type { AdminPage } from '../../../../../types/page';
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
import { ChromeLayoutAssignmentFields } from '../../../../../components/admin/appearance/ChromeLayoutAssignmentFields';
import { nestedPagePath, parentSelectOptions } from '../../../../../lib/admin/page-hierarchy';

function mapPageFromApi(raw: Record<string, unknown>): AdminPage {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    header_layout_id: raw.header_layout_id != null ? Number(raw.header_layout_id) : null,
    footer_layout_id: raw.footer_layout_id != null ? Number(raw.footer_layout_id) : null,
    parent_id: raw.parent_id != null ? Number(raw.parent_id) : null,
    path: typeof raw.path === 'string' ? raw.path : null,
    public_path: typeof raw.public_path === 'string' ? raw.public_path : null,
    depth: typeof raw.depth === 'number' ? raw.depth : 0,
    exclude_from_search: Boolean(raw.exclude_from_search),
    sections: Array.isArray(raw.sections) ? (raw.sections as PageSectionNode[]) : [],
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
    const [res, listRes] = await Promise.all([
      api.get(API_ENDPOINTS.PAGES.GET(id)),
      api.get(API_ENDPOINTS.PAGES.LIST).catch(() => []),
    ]);
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    const listBody = (listRes as { data?: unknown })?.data ?? listRes;
    const list = Array.isArray(listBody)
      ? listBody.map((row) => mapPageFromApi(row as Record<string, unknown>))
      : [];
    return {
      page: mapPageFromApi(body),
      parentOptions: parentSelectOptions(list, id),
    };
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
  const page = (pageLoader.value as { page: AdminPage }).page;
  const parentOptions = (pageLoader.value as { parentOptions: AdminPage[] }).parentOptions || [];

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
  const headerLayoutId = useSignal<number | null>(page.header_layout_id ?? null);
  const footerLayoutId = useSignal<number | null>(page.footer_layout_id ?? null);
  const parentId = useSignal<number | null>(page.parent_id ?? null);
  const excludeFromSearch = useSignal(Boolean(page.exclude_from_search));
  const sectionCount = Array.isArray(page.sections) ? page.sections.length : 0;
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
      // Metadata only — never send sections (builder owns layout).
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
        translations_json: translationsJson.value,
        header_layout_id: headerLayoutId.value,
        footer_layout_id: footerLayoutId.value,
        parent_id: parentId.value,
        exclude_from_search: excludeFromSearch.value,
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
        <div class="flex flex-wrap gap-2">
          <Link
            href={adminPageBuilderHref(lang, page.id)}
            class={ADMIN_PRIMARY_BUTTON_CLASS}
          >
            {translateApp(lang, 'pages.openBuilder')}
          </Link>
          <Link href={R.ADMIN.PAGES} class={ADMIN_BACK_BUTTON_CLASS}>
            {translateApp(lang, 'common.back')}
          </Link>
        </div>
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
                  <AdminPublicPageLink
                    lang={lang}
                    kind="pages"
                    slug={formData.value.slug}
                    parentId={parentId.value}
                    nestedPath={nestedPagePath(
                      parentOptions.find((p) => p.id === parentId.value)?.path || null,
                      formData.value.slug,
                    )}
                  />
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
              <ChromeLayoutAssignmentFields headerId={headerLayoutId} footerId={footerLayoutId} />
            </div>

            <div class={ADMIN_FORM_CARD_CLASS}>
              <div class="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50/60 px-3 py-3 dark:border-primary-900 dark:bg-primary-950/30">
                <div class="min-w-0 text-start">
                  <p class="text-sm font-medium text-primary-900 dark:text-primary-100">
                    {translateApp(lang, 'pages.builderModeHint')}
                  </p>
                  <p class="mt-0.5 text-xs text-primary-800/80 dark:text-primary-200/80">
                    {translateApp(lang, 'pages.classicSectionsHint')}
                  </p>
                  <p class="mt-2 text-xs text-primary-900/70 dark:text-primary-200/70">
                    {sectionCount > 0
                      ? translateApp(lang, 'pages.layoutBandCount').replace(
                          '{{count}}',
                          String(sectionCount),
                        )
                      : translateApp(lang, 'pages.layoutEmpty')}
                  </p>
                </div>
                <Link
                  href={adminPageBuilderHref(lang, page.id)}
                  class="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  {translateApp(lang, 'pages.openBuilder')}
                </Link>
              </div>
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
              <PageHierarchyFields
                lang={lang}
                idPrefix="page-edit"
                parentId={parentId}
                excludeFromSearch={excludeFromSearch}
                parentOptions={parentOptions}
              />
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
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  try {
    const page = (resolveValue(usePageEditor) as { page?: AdminPage })?.page;
    return { title: page?.title ? `Edit: ${page.title}` : 'Edit page' };
  } catch {
    return { title: 'Edit page' };
  }
};
