import { component$, useSignal, $, useTask$, untrack } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import { usePublicSiteMeta } from '../../layout';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../../components/admin/PerFieldContentTranslations';
import { secondaryLocalesForContent } from '../../../../../lib/content-translations';
import {
  mergeServiceFieldsForUiLocale,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../lib/content-display-locale';
import { runServiceUpdateFromBrowser } from '../../../../../lib/admin/service-actions';
import type { AdminService } from '../../../../../types/service';
import { ServiceIconSelect } from '../../../../../components/admin/ServiceIconSelect';
import { useContentSlugAutosuggestForm } from '../../../../../lib/slug/content-slug-auto';
import { AdminPublicPageLink } from '../../../../../components/admin/AdminPublicPageLink';
import { ContentSeoFields } from '../../../../../components/admin/ContentSeoFields';
import { putContentSeo } from '../../../../../lib/admin/content-seo-put';
import {
  contentSeoDraftFromRow,
  emptyContentSeoDraft,
  mergeContentSeoDraftFromContent,
  type ContentSeoDraft,
  type ContentSeoMetaRow,
} from '../../../../../types/content-seo';

function joinLines(arr: string[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) {
    return '';
  }
  return arr.join('\n');
}

function mapServiceFromApi(raw: Record<string, unknown>): AdminService {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    content_locale: (raw.content_locale as string | null) ?? null,
    short_description: (raw.short_description as string | null) ?? '',
    description: (raw.description as string | null) ?? '',
    process: Array.isArray(raw.process) ? (raw.process as string[]) : [],
    deliverables: Array.isArray(raw.deliverables) ? (raw.deliverables as string[]) : [],
    icon: (raw.icon as string | null) ?? '',
    sort_order: Number(raw.sort_order ?? 0),
    is_published: Boolean(raw.is_published ?? true),
    translations: Array.isArray(raw.translations) ? (raw.translations as AdminService['translations']) : [],
    createdAt: (raw.created_at as string) ?? (raw.createdAt as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? (raw.updatedAt as string) ?? '',
    seoMetas: Array.isArray(raw.seoMetas)
      ? (raw.seoMetas as AdminService['seoMetas'])
      : Array.isArray(raw.seo_metas)
        ? (raw.seo_metas as AdminService['seoMetas'])
        : undefined,
  };
}

export const useService = routeLoader$(async ({ params, cookie, request, fail }) => {
  try {
    const id = params.id;
    if (!id) {
      return fail(404, { message: 'Service not found' });
    }
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get(API_ENDPOINTS.SERVICES.GET(id));
    const raw = (response as any)?.data ?? response;
    if (!raw || raw.id == null) {
      return fail(404, { message: 'Service not found' });
    }
    return mapServiceFromApi(raw as Record<string, unknown>);
  } catch {
    return fail(404, { message: 'Service not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const serviceLoader = useService();
  const liveService = useSignal<AdminService | null>(null);

  const saveTranslations = {
    successTitle: String(translateApp(lang, 'common.success')),
    updatedText: String(translateApp(lang, 'common.updated')),
  };

  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.content_editing_locale);
  const canonicalName = useSignal('');
  const canonicalShortDescription = useSignal('');
  const canonicalDescription = useSignal('');
  const canonicalProcessLines = useSignal('');
  const canonicalDeliverablesLines = useSignal('');
  const translationsJson = useSignal('[]');
  const seoDraft = useSignal<ContentSeoDraft>(emptyContentSeoDraft());
  const seoMetasDraft = useSignal<ContentSeoMetaRow[]>([]);
  const saveRunning = useSignal(false);

  const formData = useSignal({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    process_lines: '',
    deliverables_lines: '',
    icon: '',
    sort_order: '',
    is_published: true,
  });

  /** Stable signal for QRL serialization (do not pass a closure for ignore id). */
  const serviceSlugIgnoreRecordId = useSignal<number | undefined>(undefined);

  const serviceSlugAuto = useContentSlugAutosuggestForm(
    'services',
    formData,
    'name',
    serviceSlugIgnoreRecordId,
  );

  useTask$(({ track }) => {
    // Must track lang config too; otherwise translations_json stays stale if site languages resolve after the service loader (Arabic rows missing from payload).
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const loaderSvc = track(() => serviceLoader.value) as AdminService | undefined;
    if (!loaderSvc?.id) {
      return;
    }
    const existing = liveService.value;
    if (existing == null || existing.id !== loaderSvc.id) {
      liveService.value = loaderSvc;
      serviceSlugAuto.slugLocked.value = false;
    }
    const s = (liveService.value ?? loaderSvc) as AdminService;
    serviceSlugIgnoreRecordId.value = s.id != null ? Number(s.id) : undefined;
    contentLocaleDraft.value =
      s.content_locale != null && String(s.content_locale).trim() !== '' ? String(s.content_locale).trim() : '';
    canonicalName.value = s.name ?? '';
    canonicalShortDescription.value = s.short_description ?? '';
    canonicalDescription.value = s.description ?? '';
    canonicalProcessLines.value = joinLines(s.process);
    canonicalDeliverablesLines.value = joinLines(s.deliverables);
    formData.value = {
      name: s.name,
      slug: s.slug || '',
      short_description: s.short_description || '',
      description: s.description || '',
      process_lines: joinLines(s.process),
      deliverables_lines: joinLines(s.deliverables),
      icon: s.icon || '',
      sort_order: String(s.sort_order ?? ''),
      is_published: s.is_published !== false,
    };
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = s.translations?.find((x) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return {
          locale: l.code,
          name: row?.name ?? '',
          short_description: row?.short_description ?? '',
          description: row?.description ?? '',
          process: Array.isArray(row?.process) ? row?.process : [],
          deliverables: Array.isArray(row?.deliverables) ? row?.deliverables : [],
        };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => liveService.value);
    track(() => serviceLoader.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    track(() => contentLocaleDraft.value);
    const s = (liveService.value ?? serviceLoader.value) as AdminService | undefined;
    if (!s?.id) {
      return;
    }
    const m = mergeServiceFieldsForUiLocale(
      s,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    serviceSlugIgnoreRecordId.value = s.id != null ? Number(s.id) : undefined;
    formData.value = {
      ...formData.value,
      name: m.name,
      short_description: m.short_description,
      description: m.description,
      process_lines: joinLines(m.process),
      deliverables_lines: joinLines(m.deliverables),
      slug: s.slug || formData.value.slug,
      icon: s.icon || formData.value.icon,
      sort_order: String(s.sort_order ?? formData.value.sort_order),
      is_published: s.is_published !== false,
    };
  });

  useTask$(({ track }) => {
    track(() => formData.value.name);
    track(() => formData.value.short_description);
    track(() => formData.value.description);
    track(() => formData.value.process_lines);
    track(() => formData.value.deliverables_lines);
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
      canonicalName.value = formData.value.name;
      canonicalShortDescription.value = formData.value.short_description;
      canonicalDescription.value = formData.value.description;
      canonicalProcessLines.value = formData.value.process_lines;
      canonicalDeliverablesLines.value = formData.value.deliverables_lines;
    }
  });

  useTask$(({ track }) => {
    track(() => serviceLoader.value?.id);
    track(() => liveService.value?.id);
    const s = (liveService.value ?? serviceLoader.value) as AdminService | undefined;
    if (!s?.id) {
      return;
    }
    const rows = Array.isArray(s.seoMetas) ? s.seoMetas : [];
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
    track(() => formData.value.name);
    track(() => formData.value.short_description);
    track(() => formData.value.description);
    const prev = untrack(() => seoDraft.value);
    seoDraft.value = mergeContentSeoDraftFromContent(prev, {
      title: formData.value.name,
      descriptionCandidates: [formData.value.short_description, formData.value.description],
    });
  });

  const handleSave = $(async () => {
    const s = (liveService.value ?? serviceLoader.value) as AdminService | undefined;
    if (!s?.id) {
      return;
    }

    saveRunning.value = true;
    const normalizedEditLocale = normalizeEditingLocale(
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    const effectivePrimarySubmit = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );

    const val = await runServiceUpdateFromBrowser({
      id: String(s.id),
      editing_locale: normalizedEditLocale,
      form_site_default_locale: langConfig.value.default_locale,
      effective_primary_locale: effectivePrimarySubmit,
      canonical_name: canonicalName.value,
      canonical_short_description: canonicalShortDescription.value,
      canonical_description: canonicalDescription.value,
      canonical_process_lines: canonicalProcessLines.value,
      canonical_deliverables_lines: canonicalDeliverablesLines.value,
      translations_json: translationsJson.value,
      content_locale: contentLocaleDraft.value,
      name: formData.value.name,
      slug: formData.value.slug,
      short_description: formData.value.short_description,
      description: formData.value.description,
      process_lines: formData.value.process_lines,
      deliverables_lines: formData.value.deliverables_lines,
      icon: formData.value.icon,
      sort_order: formData.value.sort_order,
      is_published: formData.value.is_published ? '1' : '0',
    });

    if (!val.ok) {
      saveRunning.value = false;
      await showError(val.message || 'Failed to update service');
      return;
    }

    const loc = normalizedEditLocale.toLowerCase();
    try {
      const apiClient = getApiClient();
      await putContentSeo(apiClient, 'service', Number(s.id), loc, seoDraft.value);
    } catch (err: any) {
      saveRunning.value = false;
      await showError(err?.message || 'Failed to save SEO');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.updatedText });
    saveRunning.value = false;
    // Refetch routeLoader$ + signals from DB — avoids stale merged state after PUT (matches admin/blog featured-image pattern).
    window.location.reload();
  });

  const svc = (liveService.value ?? serviceLoader.value) as AdminService | undefined;
  if (!svc?.id) {
    return (
      <div class="p-6 text-center text-gray-600 dark:text-gray-300">
        <p>{translateApp(lang, 'common.notFound') || 'Not found'}</p>
        <Link href={R.ADMIN.SERVICES} class="mt-2 inline-block text-primary-600">
          {translateApp(lang, 'common.back')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={translateApp(lang, 'services.edit')} description={translateApp(lang, 'services.subtitle')}>
        <Link
          href={R.ADMIN.SERVICES}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      <div class="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="space-y-4">
          {/* Primary language for this record (matches create form). */}
          <ContentPrimaryLanguageSelect
            siteLanguages={langConfig.value.site_languages}
            defaultLocale={langConfig.value.default_locale}
            value={contentLocaleDraft.value}
            label={translateApp(lang, 'contentTranslations.contentPrimaryLanguage')}
            hint={translateApp(lang, 'contentTranslations.contentPrimaryHint')}
            useSiteDefaultLabel={translateApp(lang, 'contentTranslations.useSiteDefault')}
            onChange$={$((code: string) => {
              contentLocaleDraft.value = code;
              const s = (liveService.value ?? serviceLoader.value) as AdminService | undefined;
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => {
                  const row = s?.translations?.find(
                    (x) => String(x?.locale).toLowerCase() === l.code.toLowerCase(),
                  );
                  return {
                    locale: l.code,
                    name: row?.name ?? '',
                    short_description: row?.short_description ?? '',
                    description: row?.description ?? '',
                    process: Array.isArray(row?.process) ? row?.process : [],
                    deliverables: Array.isArray(row?.deliverables) ? row?.deliverables : [],
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

          <EditingLocaleFieldsShell
            siteLanguages={langConfig.value.site_languages}
            editingLocale={editingLocaleDraft}
          >
          <div>
            <label for="esvc-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.name')} *
            </label>
            <input
              id="esvc-name"
              name="name"
              type="text"
              value={formData.value.name}
              onInput$={(e) => (formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value })}
              onBlur$={serviceSlugAuto.onTitleBlurSuggestSlug$}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              required
            />
          </div>

          <div>
            <label for="esvc-slug" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.slug')}
            </label>
            <input
              id="esvc-slug"
              name="slug"
              type="text"
              value={formData.value.slug}
              onInput$={$((e) => {
                serviceSlugAuto.slugLocked.value = true;
                formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value };
              })}
              onBlur$={serviceSlugAuto.onSlugBlurEnsureUnique$}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
            <AdminPublicPageLink lang={lang} kind="services" slug={formData.value.slug} />
          </div>

          <div>
            <label for="esvc-short" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.shortDescription')}
            </label>
            <input
              id="esvc-short"
              name="short_description"
              type="text"
              value={formData.value.short_description}
              onInput$={(e) =>
                (formData.value = { ...formData.value, short_description: (e.target as HTMLInputElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="esvc-desc" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.description')}
            </label>
            <textarea
              id="esvc-desc"
              name="description"
              rows={4}
              value={formData.value.description}
              onInput$={(e) =>
                (formData.value = { ...formData.value, description: (e.target as HTMLTextAreaElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="esvc-process" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.processLines')}
            </label>
            <textarea
              id="esvc-process"
              name="process_lines"
              rows={4}
              value={formData.value.process_lines}
              onInput$={(e) =>
                (formData.value = { ...formData.value, process_lines: (e.target as HTMLTextAreaElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="esvc-deliverables" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.deliverablesLines')}
            </label>
            <textarea
              id="esvc-deliverables"
              name="deliverables_lines"
              rows={4}
              value={formData.value.deliverables_lines}
              onInput$={(e) =>
                (formData.value = { ...formData.value, deliverables_lines: (e.target as HTMLTextAreaElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="esvc-icon" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.icon')}
            </label>
            <ServiceIconSelect
              id="esvc-icon"
              value={formData.value.icon}
              lang={lang}
              onChange$={$((v: string) => {
                formData.value = { ...formData.value, icon: v };
              })}
            />
          </div>

          <div>
            <label for="esvc-sort" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.sortOrder')}
            </label>
            <input
              id="esvc-sort"
              name="sort_order"
              type="number"
              min={0}
              value={formData.value.sort_order}
              onInput$={(e) =>
                (formData.value = { ...formData.value, sort_order: (e.target as HTMLInputElement).value })
              }
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              id="esvc-published"
              name="is_published"
              type="checkbox"
              checked={formData.value.is_published}
              onChange$={(e) =>
                (formData.value = { ...formData.value, is_published: (e.target as HTMLInputElement).checked })
              }
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="esvc-published" class="text-sm font-medium text-gray-700 dark:text-gray-200">
              {translateApp(lang, 'services.published')}
            </label>
          </div>

          <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">{translateApp(lang, 'seo.title')}</h3>
            {/* <!-- SEO row per editing locale --> */}
            <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'seo.forEditingLocale')}</p>
            <ContentSeoFields lang={lang} idPrefix="service" draft={seoDraft} />
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              preventdefault:click
              disabled={saveRunning.value}
              onClick$={handleSave}
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saveRunning.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.update')}
            </button>
            <Link
              href={R.ADMIN.SERVICES}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.cancel')}
            </Link>
          </div>
          </EditingLocaleFieldsShell>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit service - Dashboard',
  meta: [{ name: 'description', content: 'Edit service' }],
};
