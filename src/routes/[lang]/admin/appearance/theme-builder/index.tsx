import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ThemeTemplateListPage } from '~/components/admin/appearance/ThemeTemplateListPage';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { ThemeTemplateMeta } from '~/types/chrome-layout';

export const useThemeTemplatesList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.APPEARANCE.THEME_TEMPLATES);
    const body = (res as { data?: unknown })?.data ?? res;
    const rows = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [];
    return rows as ThemeTemplateMeta[];
  } catch {
    return [] as ThemeTemplateMeta[];
  }
});

export default component$(() => {
  const list = useThemeTemplatesList();
  return <ThemeTemplateListPage initialItems={list.value} />;
});

export const head: DocumentHead = { title: 'Theme Builder' };
