import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { EmptyState } from '~/components/common/EmptyState';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { showError, showSuccess } from '~/lib/utils/toast';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { getLocalizedRoutes, routesFromPreferredCookie } from '~/lib/constants/routes';
import { builderTemplateKindLabel } from '~/lib/admin/builder-template-labels';
import type { BuilderTemplateRow } from '~/lib/admin/builder-templates';
import {
  mapBuilderTemplateRow,
  runBuilderTemplateRenameFromBrowser,
  type TemplateApiRow,
} from '~/lib/admin/builder-template-actions';
import {
  ADMIN_BACK_BUTTON_CLASS,
  ADMIN_FORM_CARD_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

export const useBuilderTemplateRecord = routeLoader$(async ({ cookie, request, params, redirect }) => {
  // Templates are only created from a builder, so `/templates/new` goes back to the list.
  if (!/^\d+$/.test(params.id)) throw redirect(302, routesFromPreferredCookie(cookie).ADMIN.APPEARANCE_TEMPLATES);
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get<TemplateApiRow>(API_ENDPOINTS.APPEARANCE.TEMPLATE_GET(params.id));
    return mapBuilderTemplateRow(res.data ?? {});
  } catch (error: unknown) {
    console.error('Failed to load builder template:', error);
    return null as BuilderTemplateRow | null;
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const nav = useNavigate();
  const record = useBuilderTemplateRecord();
  const name = useSignal(record.value?.name ?? '');
  const saving = useSignal(false);

  const save$ = $(async () => {
    const id = record.value?.id;
    const trimmed = name.value.trim();
    if (!id || saving.value) return;
    if (trimmed === '') {
      showError(translateApp(lang, 'pages.templateNameRequired'));
      return;
    }
    saving.value = true;
    const res = await runBuilderTemplateRenameFromBrowser(id, trimmed);
    saving.value = false;
    if (!res.ok) {
      showError(res.message);
      return;
    }
    showSuccess(translateApp(lang, 'common.updated'));
    await nav(R.ADMIN.APPEARANCE_TEMPLATES);
  });

  return (
    <>
      <PageHeader title={translateApp(lang, 'builderTemplates.rename')} description={record.value?.name}>
        <Link href={R.ADMIN.APPEARANCE_TEMPLATES} class={ADMIN_BACK_BUTTON_CLASS}>
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>

      {/* Missing or deleted template */}
      {!record.value ? (
        <EmptyState title={translateApp(lang, 'builderTemplates.notFound')} />
      ) : (
        <form
          class={`${ADMIN_FORM_CARD_CLASS} flex max-w-xl flex-col items-start gap-4`}
          preventdefault:submit
          onSubmit$={save$}
        >
          <div class="w-full">
            <label for="builder-template-name" class={ADMIN_FORM_LABEL_CLASS}>
              {translateApp(lang, 'common.name')}
            </label>
            <input
              id="builder-template-name"
              type="text"
              required
              maxLength={120}
              class={ADMIN_FORM_INPUT_CLASS}
              value={name.value}
              onInput$={(e) => {
                name.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {translateApp(lang, 'builderTemplates.kind')}:{' '}
            <span class="font-medium">{builderTemplateKindLabel(lang, record.value)}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{translateApp(lang, 'builderTemplates.editHint')}</p>
          <button type="submit" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value}>
            {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
          </button>
        </form>
      )}
    </>
  );
});

export const head: DocumentHead = { title: 'Rename builder template - Dashboard' };
