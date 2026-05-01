import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useNavigate, Link } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { useTranslate } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { useSiteLanguageConfig } from '../../layout';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
  EditingLocaleFieldsShell,
} from '../../../../components/admin/PerFieldContentTranslations';
import { secondaryLocalesForContent } from '../../../../lib/content-translations';
import {
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../lib/content-display-locale';
import { useCreateService } from '../../../../lib/admin/service-actions';
import { ROUTES } from '../../../../lib/constants/routes';
import type { AdminService } from '../../../../types/service';

export default component$(() => {
  const { t } = useTranslate();
  const { success, error: showError } = useSwal();
  const navigate = useNavigate();
  const langConfig = useSiteLanguageConfig();
  const createAction = useCreateService();

  const saveTranslations = {
    successTitle: String(t('common.success')),
    createdText: String(t('common.created')),
  };

  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.default_locale);
  const canonicalName = useSignal('');
  const canonicalShortDescription = useSignal('');
  const canonicalDescription = useSignal('');
  const canonicalProcessLines = useSignal('');
  const canonicalDeliverablesLines = useSignal('');
  const translationsJson = useSignal('[]');

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

  useTask$(({ track }) => {
    track(() => contentLocaleDraft.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => ({
        locale: l.code,
        name: '',
        short_description: '',
        description: '',
        process: [],
        deliverables: [],
      })),
    );
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

  const submitWithFormData = $(async (action: any, fields: Record<string, any>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) {
        continue;
      }
      if (Array.isArray(v)) {
        for (const item of v) {
          fd.append(`${k}[]`, String(item));
        }
      } else {
        fd.append(k, String(v));
      }
    }
    await action.submit(fd);
    return (action as any).value;
  });

  const handleSave = $(async () => {
    const val = await submitWithFormData(createAction, {
      editing_locale: normalizeEditingLocale(
        editingLocaleDraft.value,
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
      form_site_default_locale: langConfig.value.default_locale,
      effective_primary_locale: primaryLocaleForContent(
        langConfig.value.site_languages,
        langConfig.value.default_locale,
        contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
      ),
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

    if (val?.failed) {
      await showError(val.message || val.error || 'Failed to create service');
      return;
    }

    await success(saveTranslations.successTitle, { text: saveTranslations.createdText });
    const created = val?.service as AdminService | undefined;
    if (created?.id != null) {
      await navigate(ROUTES.ADMIN.SERVICES_EDIT(created.id));
    } else {
      await navigate(ROUTES.ADMIN.SERVICES);
    }
  });

  return (
    <>
      <PageHeader title={t('services.addNew')} description={t('services.subtitle')}>
        <Link
          href={ROUTES.ADMIN.SERVICES}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {t('common.back') || 'Back'}
        </Link>
      </PageHeader>

      <div class="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div class="space-y-4">
          <ContentPrimaryLanguageSelect
            siteLanguages={langConfig.value.site_languages}
            defaultLocale={langConfig.value.default_locale}
            value={contentLocaleDraft.value}
            label={t('contentTranslations.contentPrimaryLanguage')}
            hint={t('contentTranslations.contentPrimaryHint')}
            useSiteDefaultLabel={t('contentTranslations.useSiteDefault')}
            onChange$={$((code: string) => {
              contentLocaleDraft.value = code;
              const secondaries = secondaryLocalesForContent(
                langConfig.value.site_languages,
                langConfig.value.default_locale,
                contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
              );
              translationsJson.value = JSON.stringify(
                secondaries.map((l) => ({
                  locale: l.code,
                  name: '',
                  short_description: '',
                  description: '',
                  process: [],
                  deliverables: [],
                })),
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
            label={t('contentTranslations.sectionTitle')}
            hintPrimary={t('contentTranslations.defaultHint')}
            hintSecondary={t('contentTranslations.fallbackPlaceholderHint')}
            secondarySavePrefix={t('contentTranslations.addTranslations')}
            onChange$={$((code: string) => {
              editingLocaleDraft.value = code;
            })}
          />

          <EditingLocaleFieldsShell
            siteLanguages={langConfig.value.site_languages}
            editingLocale={editingLocaleDraft}
          >
          <div>
            <label for="svc-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.name')} *
            </label>
            <input
              id="svc-name"
              name="name"
              type="text"
              value={formData.value.name}
              onInput$={(e) => (formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value })}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              required
            />
          </div>

          <div>
            <label for="svc-slug" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.slug')} *
            </label>
            <input
              id="svc-slug"
              name="slug"
              type="text"
              value={formData.value.slug}
              onInput$={(e) => (formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value })}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              required
            />
          </div>

          <div>
            <label for="svc-short" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.shortDescription')}
            </label>
            <input
              id="svc-short"
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
            <label for="svc-desc" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.description')}
            </label>
            <textarea
              id="svc-desc"
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
            <label for="svc-process" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.processLines')}
            </label>
            <textarea
              id="svc-process"
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
            <label for="svc-deliverables" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.deliverablesLines')}
            </label>
            <textarea
              id="svc-deliverables"
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
            <label for="svc-icon" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.icon')}
            </label>
            <input
              id="svc-icon"
              name="icon"
              type="text"
              value={formData.value.icon}
              onInput$={(e) => (formData.value = { ...formData.value, icon: (e.target as HTMLInputElement).value })}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          <div>
            <label for="svc-sort" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.sortOrder')}
            </label>
            <input
              id="svc-sort"
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
              id="svc-published"
              name="is_published"
              type="checkbox"
              checked={formData.value.is_published}
              onChange$={(e) =>
                (formData.value = { ...formData.value, is_published: (e.target as HTMLInputElement).checked })
              }
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="svc-published" class="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('services.published')}
            </label>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              preventdefault:click
              onClick$={handleSave}
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              {t('common.add')}
            </button>
            <Link
              href={ROUTES.ADMIN.SERVICES}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Link>
          </div>
          </EditingLocaleFieldsShell>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'New service - Dashboard',
  meta: [{ name: 'description', content: 'Create a service' }],
};
