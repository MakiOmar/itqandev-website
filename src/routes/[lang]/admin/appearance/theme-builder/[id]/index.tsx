import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ThemeTemplateEditorPage } from '~/components/admin/appearance/ThemeTemplateEditorPage';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { ThemeTemplateMeta } from '~/types/chrome-layout';

export const useThemeTemplate = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATE_GET(id));
    return ((res as { data?: unknown })?.data ?? res) as ThemeTemplateMeta;
  } catch {
    return fail(404, { message: 'Theme template not found' });
  }
});

export default component$(() => {
  const tpl = useThemeTemplate();
  return <ThemeTemplateEditorPage mode="edit" initial={tpl.value as ThemeTemplateMeta} />;
});

export const head: DocumentHead = { title: 'Edit theme template' };
