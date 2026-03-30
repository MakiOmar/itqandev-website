import { component$, useSignal, $, useComputed$, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, zod$, z, Form } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import type { Category, CategoryCreateInput, CategoryUpdateInput } from '../../../types';
import { useSiteLanguageConfig } from '../layout';
import { useLocaleAwareList } from '../../../lib/hooks/useLocaleAwareList';
import {
  ContentEditingLanguageSelect,
  ContentPrimaryLanguageSelect,
} from '../../../components/admin/PerFieldContentTranslations';
import { parseTranslationsJson, secondaryLocalesForContent } from '../../../lib/content-translations';
import {
  mergeCategoryFieldsForUiLocale,
  mergeSecondaryCategoryTranslations,
  normalizeEditingLocale,
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../lib/content-display-locale';

/**
 * API payload shape returned by Laravel index()
 * Backend returns:
 *   - { data: Category[], meta?: ... } OR
 *   - a JSON string (cached) representing that object
 */
type CategoriesListPayload = {
  data: Category[];
  meta?: { cache?: { hit?: boolean } };
};

/**
 * Category schema (used by Qwik City action validation)
 * Note: action data comes as strings from forms, so is_featured can be "1"/"on"/"true".
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  is_featured: z.union([z.boolean(), z.string()]).optional(),
});

/**
 * Load categories
 */
export const useCategories = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);

    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST);
    let body: unknown = (response as any)?.data ?? response;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Categories response was a string but not valid JSON:', e);
        return [];
      }
    }

    if (body && typeof body === 'object' && 'data' in (body as any) && Array.isArray((body as any).data)) {
      return (body as CategoriesListPayload).data;
    }

    if (Array.isArray(body)) {
      return body as Category[];
    }

    return [];
  } catch (error: any) {
    console.error('Failed to load categories:', error);
    return [];
  }
});

const toBool = (v: unknown) => v === true || v === '1' || v === 'on' || v === 'true';

/**
 * Create category action (server-side, authenticated via forwarded cookies)
 */
export const useCreateCategory = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader);

      const payload: CategoryCreateInput = {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        isFeatured: toBool((data as any).is_featured),
      };

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as CategoryCreateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');
      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
        }
      } else {
        (payload as any).name = canonicalName;
        (payload as any).description = canonicalDescription;
        (payload as unknown as { translations?: unknown[] }).translations = mergeSecondaryCategoryTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          { name: String(data.name || ''), description: String(data.description ?? '') },
        );
      }

      const response = await apiClient.post<Category>(API_ENDPOINTS.CATEGORIES.CREATE, payload);
      const created = (response as any)?.data ?? response;

      return { success: true, category: created as Category };
    } catch (err: any) {
      return fail(500, { message: err?.message || 'Failed to create category' });
    }
  },
  zod$(categorySchema)
);

/**
 * Update category action (server-side, authenticated via forwarded cookies)
 */
export const useUpdateCategory = routeAction$(
  async (data, { cookie, request, fail }) => {
    try {
      const cookieHeader = extractCookieHeader(cookie, request as any);
      const apiClient = getApiClient(cookieHeader);

      const payload: CategoryUpdateInput = {
        id: Number((data as any).id),
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        isFeatured: toBool((data as any).is_featured),
      };

      const rawContentLocale = (data as { content_locale?: string }).content_locale?.trim();
      (payload as CategoryUpdateInput & { content_locale?: string | null }).content_locale =
        rawContentLocale && rawContentLocale.length > 0 ? rawContentLocale : null;

      const parsedTranslations = parseTranslationsJson((data as { translations_json?: string }).translations_json);
      const siteDef = String((data as { form_site_default_locale?: string }).form_site_default_locale || 'en');
      const effectivePrimary = String((data as { effective_primary_locale?: string }).effective_primary_locale || siteDef);
      const editingLocale = String((data as { editing_locale?: string }).editing_locale || effectivePrimary);
      const canonicalName = String((data as { canonical_name?: string }).canonical_name ?? '');
      const canonicalDescription = String((data as { canonical_description?: string }).canonical_description ?? '');
      if (shouldWritePrimaryColumns(editingLocale, effectivePrimary)) {
        if (parsedTranslations) {
          (payload as unknown as { translations?: unknown[] }).translations = parsedTranslations;
        }
      } else {
        (payload as any).name = canonicalName;
        (payload as any).description = canonicalDescription;
        (payload as unknown as { translations?: unknown[] }).translations = mergeSecondaryCategoryTranslations(
          (data as { translations_json?: string }).translations_json,
          editingLocale,
          { name: String(data.name || ''), description: String(data.description ?? '') },
        );
      }

      const response = await apiClient.put<Category>(
        API_ENDPOINTS.CATEGORIES.UPDATE(String((data as any).id)),
        payload
      );

      const updated = (response as any)?.data ?? response;
      return { success: true, category: updated as Category };
    } catch (err: any) {
      return fail(401, { message: err?.message || 'Unauthorized' });
    }
  },
  zod$(categorySchema.extend({ id: z.string() }))
);

/**
 * Delete category action (server-side, authenticated via forwarded cookies)
 */
export const useDeleteCategory = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);

    await apiClient.delete(API_ENDPOINTS.CATEGORIES.DELETE((data as any).id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete category' });
  }
});

/**
 * Bulk delete categories action (server-side, authenticated via forwarded cookies)
 */
export const useBulkDeleteCategories = routeAction$(async (data, { cookie, request, fail }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request as any);
    const apiClient = getApiClient(cookieHeader);

    // data.ids may arrive as string[] or string
    const idsRaw = (data as any).ids;
    const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : [];

    await apiClient.post(API_ENDPOINTS.CATEGORIES.BULK_DELETE, { ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error?.message || 'Failed to delete categories' });
  }
});

/**
 * Categories page
 */
export default component$(() => {
  const { t } = useTranslate();
  const { confirm, success, error: showError } = useSwal();

  const categories = useCategories();
  const langConfig = useSiteLanguageConfig();

  // local mutable state for instant UI updates (no navigation)
  const { items: categoriesState, loading } = useLocaleAwareList<Category>(
    categories.value ?? [],
    $((loc) => {
      const apiClient = getApiClient(undefined, loc);
      return apiClient.get(API_ENDPOINTS.CATEGORIES.LIST).then((response: any) => {
        let body: unknown = response?.data ?? response;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            return [];
          }
        }
        if (body && typeof body === 'object' && 'data' in (body as any) && Array.isArray((body as any).data)) {
          return (body as any).data as Category[];
        }
        if (Array.isArray(body)) {
          return body as Category[];
        }
        return [];
      });
    }),
  );
  useTask$(({ track }) => {
    track(() => categories.value);
    // keep SSR loader data as baseline; locale-aware hook will refetch on locale changes
  });

  const createAction = useCreateCategory();
  const updateAction = useUpdateCategory();
  const deleteAction = useDeleteCategory();
  const bulkDeleteAction = useBulkDeleteCategories();

  const translations = {
    success: t('common.success'),
    updated: t('common.updated'),
    created: t('common.created'),
    deleted: t('common.deleted'),
    delete: t('common.delete'),
    deleteConfirm: t('categories.deleteConfirm'),
  };

  const showForm = useSignal(false);
  const editingId = useSignal<number | null>(null);
  const contentLocaleDraft = useSignal('');
  const editingLocaleDraft = useSignal(langConfig.value.default_locale);
  const canonicalName = useSignal('');
  const canonicalDescription = useSignal('');
  const translationsJson = useSignal('[]');
  const selectedItems = useSignal<string[]>([]);
  const searchQuery = useSignal('');

  const languageLabelByCode = new Map(
    langConfig.value.site_languages.map((l) => [String(l.code).toLowerCase(), l.native_label || l.label || l.code]),
  );

  const mainLocaleLabel = (category: Category): string => {
    const main = primaryLocaleForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      (category as any).content_locale ?? null,
    );
    return `${languageLabelByCode.get(main) || main} (${main})`;
  };

  const translationsLabel = (category: Category): string => {
    const rows = (category as any).translations as Array<{ locale?: string | null }> | undefined;
    const locales = Array.isArray(rows)
      ? Array.from(
          new Set(
            rows
              .map((r) => String(r?.locale ?? '').trim().toLowerCase())
              .filter((x) => x.length > 0),
          ),
        )
      : [];
    if (locales.length === 0) {
      return t('contentTranslations.noSecondaryLanguages') || '—';
    }
    const labels = locales.map((code) => `${languageLabelByCode.get(code) || code} (${code})`);
    return `${locales.length}: ${labels.join(', ')}`;
  };

  const filteredCategories = useComputed$(() => {
    const list = categoriesState.value || [];
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.slug ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    );
  });

  const formData = useSignal({
    name: '',
    slug: '',
    description: '',
    is_featured: false,
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
  });

  const resetForm = $(() => {
    formData.value = { name: '', slug: '', description: '', is_featured: false };
    editingId.value = null;
    showForm.value = false;
    contentLocaleDraft.value = '';
    canonicalName.value = '';
    canonicalDescription.value = '';
    translationsJson.value = '[]';
  });

  const editCategory = $((category: Category) => {
    canonicalName.value = category.name ?? '';
    canonicalDescription.value = category.description ?? '';
    formData.value = {
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      is_featured: (category as any).isFeatured || false,
    };
    editingId.value = category.id;
    showForm.value = true;
    contentLocaleDraft.value =
      (category as any).content_locale != null && String((category as any).content_locale).trim() !== ''
        ? String((category as any).content_locale).trim()
        : '';

    const secondaries = secondaryLocalesForContent(
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    translationsJson.value = JSON.stringify(
      secondaries.map((l) => {
        const row = (category as any).translations?.find((x: any) => String(x?.locale).toLowerCase() === l.code.toLowerCase());
        return { locale: l.code, name: row?.name ?? '', description: row?.description ?? '' };
      }),
    );
  });

  useTask$(({ track }) => {
    track(() => editingLocaleDraft.value);
    track(() => categoriesState.value);
    track(() => editingId.value);
    track(() => langConfig.value.site_languages);
    track(() => langConfig.value.default_locale);
    track(() => contentLocaleDraft.value);
    if (!editingId.value) {
      return;
    }
    const current = (categoriesState.value || []).find((c) => c.id === editingId.value);
    if (!current) {
      return;
    }
    const m = mergeCategoryFieldsForUiLocale(
      current,
      editingLocaleDraft.value,
      langConfig.value.site_languages,
      langConfig.value.default_locale,
      contentLocaleDraft.value.trim() !== '' ? contentLocaleDraft.value.trim() : null,
    );
    formData.value = {
      ...formData.value,
      name: m.name,
      description: m.description,
      slug: current.slug || formData.value.slug,
      is_featured: (current as any).isFeatured || false,
    };
  });

  // Helper: submit a Qwik action with FormData (avoids “action is unauthorized” issues)
  const submitWithFormData = $(async (action: any, fields: Record<string, any>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        // for arrays: ids[] style
        for (const item of v) fd.append(`${k}[]`, String(item));
      } else {
        fd.append(k, String(v));
      }
    }
    await action.submit(fd);
    return (action as any).value;
  });

  const handleSave = $(async () => {
    // UPDATE
    if (editingId.value) {
      const val = await submitWithFormData(updateAction, {
        id: String(editingId.value),
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
        canonical_description: canonicalDescription.value,
        translations_json: translationsJson.value,
        content_locale: contentLocaleDraft.value,
        name: formData.value.name,
        slug: formData.value.slug,
        description: formData.value.description,
        is_featured: formData.value.is_featured ? '1' : undefined,
      });

      if (val?.failed) {
        await showError(val.message || 'Failed to update category');
        return;
      }

      await success(translations.success, { text: translations.updated });

      const updated = val?.category as Category | undefined;
      if (updated) {
        categoriesState.value = categoriesState.value.map((c) => (c.id === updated.id ? updated : c));
      } else {
        // fallback optimistic patch
        const id = editingId.value;
        categoriesState.value = categoriesState.value.map((c) =>
          c.id === id
            ? ({
                ...c,
                name: formData.value.name,
                slug: formData.value.slug || (c as any).slug,
                description: formData.value.description || (c as any).description,
                isFeatured: !!formData.value.is_featured,
              } as any)
            : c
        );
      }

      resetForm();
      return;
    }

    // CREATE
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
      canonical_description: canonicalDescription.value,
      translations_json: translationsJson.value,
      content_locale: contentLocaleDraft.value,
      name: formData.value.name,
      slug: formData.value.slug,
      description: formData.value.description,
      is_featured: formData.value.is_featured ? '1' : undefined,
    });

    if (val?.failed) {
      await showError(val.message || val.error || 'Failed to create category');
      return;
    }

    await success(translations.success, { text: translations.created });

    const created = val?.category as Category | undefined;
    if (created) {
      categoriesState.value = [created, ...categoriesState.value];
    }

    resetForm();
  });

  const handleDelete = $(async (category: Category) => {
    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    const val = await submitWithFormData(deleteAction, { id: String(category.id) });
    if (val?.failed) {
      await showError(val.message || 'Failed to delete category');
      return;
    }

    await success(translations.success, { text: translations.deleted });
    categoriesState.value = categoriesState.value.filter((c) => c.id !== category.id);
    selectedItems.value = selectedItems.value.filter((id) => id !== String(category.id));
  });

  const handleBulkDelete = $(async () => {
    if (selectedItems.value.length === 0) return;

    const result = await confirm(translations.deleteConfirm, { icon: 'warning', title: translations.delete });
    if (!result.isConfirmed) return;

    // send ids[] as array
    const val = await submitWithFormData(bulkDeleteAction, { ids: selectedItems.value });
    if (val?.failed) {
      await showError(val.message || 'Failed to delete categories');
      return;
    }

    await success(translations.success, { text: translations.deleted });

    const toDelete = new Set(selectedItems.value);
    categoriesState.value = categoriesState.value.filter((c) => !toDelete.has(String(c.id)));
    selectedItems.value = [];
  });

  const toggleSelect = $((id: string) => {
    const next = [...selectedItems.value];
    const index = next.indexOf(id);
    if (index > -1) next.splice(index, 1);
    else next.push(id);
    selectedItems.value = next;
  });

  const deselectAll = $(() => {
    selectedItems.value = [];
  });

  return (
    <>
      <PageHeader title={t('categories.title')} description={t('categories.subtitle')}>
        <div class="flex gap-2">
          {selectedItems.value.length > 0 && (
            <>
              <button
                type="button"
                onClick$={handleBulkDelete}
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                {t('common.delete')} ({selectedItems.value.length})
              </button>
              <button
                type="button"
                onClick$={deselectAll}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </>
          )}

          {!showForm.value ? (
            <button
              type="button"
              onClick$={() => (showForm.value = true)}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              {t('categories.addNew')}
            </button>
          ) : (
            <button
              type="button"
              onClick$={resetForm}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        {showForm.value && (
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId.value ? t('categories.edit') : t('categories.addNew')}
            </h2>

            {/* Real Qwik City form (like your Project edit page) */}
            <Form action={editingId.value ? updateAction : createAction} class="space-y-4">
              {editingId.value && <input type="hidden" name="id" value={String(editingId.value)} />}
              <input type="hidden" name="translations_json" value={translationsJson.value} />
              <input type="hidden" name="canonical_name" value={canonicalName.value} />
              <input type="hidden" name="canonical_description" value={canonicalDescription.value} />
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

              {!editingId.value ? (
                <ContentPrimaryLanguageSelect
                  siteLanguages={langConfig.value.site_languages}
                  defaultLocale={langConfig.value.default_locale}
                  value={contentLocaleDraft.value}
                  label={t('contentTranslations.contentPrimaryLanguage')}
                  hint={t('contentTranslations.contentPrimaryHint')}
                  useSiteDefaultLabel={t('contentTranslations.useSiteDefault')}
                  onChange$={$((code: string) => {
                    contentLocaleDraft.value = code;
                  })}
                />
              ) : null}

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

              <div>
                <label for="name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('categories.name')} *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.value.name}
                  onInput$={(e) => (formData.value = { ...formData.value, name: (e.target as HTMLInputElement).value })}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  required
                />
              </div>

              <div>
                <label for="slug" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('categories.slug')}
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.value.slug}
                  onInput$={(e) => (formData.value = { ...formData.value, slug: (e.target as HTMLInputElement).value })}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>

              <div>
                <label for="description" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('categories.description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.value.description}
                  onInput$={(e) =>
                    (formData.value = { ...formData.value, description: (e.target as HTMLTextAreaElement).value })
                  }
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  id="is_featured"
                  name="is_featured"
                  type="checkbox"
                  value="1"
                  checked={formData.value.is_featured}
                  onChange$={(e) =>
                    (formData.value = { ...formData.value, is_featured: (e.target as HTMLInputElement).checked })
                  }
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label for="is_featured" class="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('categories.featured')}
                </label>
              </div>

              <div class="flex gap-2">
                <button
                  type="button"
                  preventdefault:click
                  onClick$={handleSave}
                  class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                >
                  {editingId.value ? t('common.update') : t('common.add')}
                </button>
                <button
                  type="button"
                  onClick$={resetForm}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* List */}
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('categories.list')}</h2>

          {/* Search */}
          <div class="mb-4">
            <input
              type="text"
              value={searchQuery.value}
              onInput$={(e) => handleSearch((e.target as HTMLInputElement).value)}
              placeholder={t('common.search')}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>

          {loading.value ? (
            <div class="py-6 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          ) : filteredCategories.value.length === 0 ? (
            <EmptyState title={t('categories.noCategories')} />
          ) : (
            <ul class="space-y-2">
              {filteredCategories.value.map((category) => (
                <li
                  key={category.id}
                  class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.value.includes(String(category.id))}
                      onChange$={() => toggleSelect(String(category.id))}
                      class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />

                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {t('categories.slug')}: {category.slug}
                      </p>

                      {category.description && (
                        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                      )}

                      <div class="mt-1 flex flex-wrap gap-1">
                        <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                          {t('contentTranslations.contentPrimaryLanguage')}: {mainLocaleLabel(category)}
                        </span>
                        <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-300">
                          {t('contentTranslations.addTranslations')}: {translationsLabel(category)}
                        </span>
                      </div>

                      {(category as any).isFeatured && (
                        <span class="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                          {t('categories.featured')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {t('categories.projectsCount', { count: (category as any).projectsCount ?? 0 })}
                    </span>

                    <button
                      type="button"
                      onClick$={() => editCategory(category)}
                      class="rounded-lg px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      {t('common.edit')}
                    </button>

                    <button
                      type="button"
                      onClick$={() => handleDelete(category)}
                      class="rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Categories - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage categories',
    },
  ],
};
