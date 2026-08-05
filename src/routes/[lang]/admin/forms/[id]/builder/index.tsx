import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { FormBuilderWorkspace } from '../../../../../../components/admin/forms/FormBuilderWorkspace';
import { useTranslate, translateApp } from '../../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../../layout';
import { runFormUpdateFromBrowser } from '../../../../../../lib/admin/form-actions';
import { adminApiClient } from '../../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../../lib/api/endpoints';
import {
  adminFormEditHref,
  adminFormSubmissionsHref,
} from '../../../../../../lib/constants/routes';
import { fetchAppearanceRegistriesFromBrowser } from '../../../../../../lib/admin/appearance-actions';
import {
  ensureFormActions,
  ensureFormLayout,
  ensureFormSettings,
} from '../../../../../../lib/admin/form-layout';
import {
  primaryLocaleForContent,
  shouldWritePrimaryColumns,
} from '../../../../../../lib/content-display-locale';
import type {
  AdminForm,
  FormActionNode,
  FormActionRegistryEntry,
  FormFieldRegistryEntry,
  FormLayoutDocument,
  FormSettings,
} from '../../../../../../types/form';

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

export const useFormBuilderData = routeLoader$(async ({ params, cookie, request, fail }) => {
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
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const formLoader = useFormBuilderData();
  const form = formLoader.value as AdminForm;

  const layout = useSignal<FormLayoutDocument>(ensureFormLayout(form.layout));
  const actions = useSignal<FormActionNode[]>(ensureFormActions(form.actions));
  const settings = useSignal<FormSettings>(ensureFormSettings(form.settings));
  const fieldRegistry = useSignal<FormFieldRegistryEntry[]>([]);
  const actionRegistry = useSignal<FormActionRegistryEntry[]>([]);
  const formTitle = useSignal(form.title);
  const contentLocale = useSignal(form.content_locale || '');
  const editingLocale = useSignal(langConfig.value.default_locale || 'en');
  const canonicalTitle = useSignal(form.title);
  const translationsJson = useSignal(JSON.stringify(form.translations || []));
  const activeLocale = useSignal(langConfig.value.default_locale || 'en');
  const saving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      fieldRegistry.value = regs.form_fields ?? [];
      actionRegistry.value = regs.form_actions ?? [];
    } catch {
      fieldRegistry.value = [];
      actionRegistry.value = [];
    }
  });

  const handleSave$ = $(async () => {
    if (!formTitle.value.trim()) {
      await showError(translateApp(lang, 'forms.titleRequired'));
      return;
    }
    saving.value = true;
    try {
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        contentLocale.value.trim() || null,
      );
      const editing = editingLocale.value || effectivePrimary;
      if (shouldWritePrimaryColumns(editing, effectivePrimary)) {
        canonicalTitle.value = formTitle.value;
      }
      const result = await runFormUpdateFromBrowser(form.id, {
        title: formTitle.value,
        slug: form.slug,
        status: form.status === 'published' ? 'published' : 'draft',
        content_locale: contentLocale.value,
        editing_locale: editing,
        effective_primary_locale: effectivePrimary,
        canonical_title: canonicalTitle.value,
        layout_json: JSON.stringify(ensureFormLayout(layout.value)),
        actions_json: JSON.stringify(ensureFormActions(actions.value)),
        settings_json: JSON.stringify(ensureFormSettings(settings.value)),
        translations_json: translationsJson.value,
      });
      if (result.success) {
        // Keep local translations JSON in sync after secondary-locale title saves.
        if (!shouldWritePrimaryColumns(editing, effectivePrimary)) {
          const list = JSON.parse(translationsJson.value || '[]') as Array<Record<string, unknown>>;
          const u = editing.toLowerCase();
          const idx = list.findIndex(
            (row) => String(row.locale ?? '').toLowerCase() === u,
          );
          const row = { locale: u, title: formTitle.value };
          if (idx >= 0) list[idx] = { ...list[idx], ...row };
          else list.push(row);
          translationsJson.value = JSON.stringify(list);
        }
        await success(translateApp(lang, 'common.updated'));
      } else {
        await showError(result.error || translateApp(lang, 'common.error'));
      }
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="fixed inset-0 z-40 flex flex-col bg-gray-100 dark:bg-slate-950">
      <FormBuilderWorkspace
        lang={lang}
        formId={form.id}
        formTitle={formTitle}
        classicEditHref={adminFormEditHref(lang, form.id)}
        submissionsHref={adminFormSubmissionsHref(lang, form.id)}
        layout={layout}
        actions={actions}
        settings={settings}
        fieldRegistry={fieldRegistry}
        actionRegistry={actionRegistry}
        siteLanguages={langConfig.value.site_languages || []}
        defaultLocale={langConfig.value.default_locale || 'en'}
        contentLocale={contentLocale}
        editingLocale={editingLocale}
        canonicalTitle={canonicalTitle}
        translationsJson={translationsJson}
        activeLocale={activeLocale}
        saving={saving}
        onSave$={handleSave$}
      />
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  try {
    const form = resolveValue(useFormBuilderData) as AdminForm;
    return {
      title: form?.title
        ? `Builder: ${form.title}`
        : translateApp('en', 'forms.builderTitle'),
    };
  } catch {
    return { title: 'Form builder' };
  }
};
