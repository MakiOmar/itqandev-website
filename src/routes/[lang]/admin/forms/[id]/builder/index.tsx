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
import { primaryLocaleForContent } from '../../../../../../lib/content-display-locale';
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
    saving.value = true;
    try {
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        form.content_locale,
      );
      const result = await runFormUpdateFromBrowser(form.id, {
        title: form.title,
        slug: form.slug,
        status: form.status === 'published' ? 'published' : 'draft',
        content_locale: form.content_locale || '',
        editing_locale: effectivePrimary,
        effective_primary_locale: effectivePrimary,
        canonical_title: form.title,
        layout_json: JSON.stringify(ensureFormLayout(layout.value)),
        actions_json: JSON.stringify(ensureFormActions(actions.value)),
        settings_json: JSON.stringify(ensureFormSettings(settings.value)),
        translations_json: JSON.stringify(form.translations || []),
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
    <div class="fixed inset-0 z-40 flex flex-col bg-gray-100 dark:bg-slate-950">
      <FormBuilderWorkspace
        lang={lang}
        formId={form.id}
        formTitle={form.title}
        classicEditHref={adminFormEditHref(lang, form.id)}
        submissionsHref={adminFormSubmissionsHref(lang, form.id)}
        layout={layout}
        actions={actions}
        settings={settings}
        fieldRegistry={fieldRegistry}
        actionRegistry={actionRegistry}
        siteLanguages={langConfig.value.site_languages || []}
        defaultLocale={langConfig.value.default_locale || 'en'}
        activeLocale={activeLocale}
        saving={saving}
        onSave$={handleSave$}
      />
    </div>
  );
});

export const head: DocumentHead = ({ params }) => ({
  title: translateApp(String(params.lang || 'en'), 'forms.builderTitle'),
  meta: [
    { name: 'description', content: 'Fullscreen form layout builder' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
});
