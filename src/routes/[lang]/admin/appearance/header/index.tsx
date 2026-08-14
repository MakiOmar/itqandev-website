import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ChromeLayoutListPage } from '~/components/admin/appearance/ChromeLayoutListPage';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { ChromeLayoutMeta } from '~/types/chrome-layout';

function mapLayout(raw: Record<string, unknown>): ChromeLayoutMeta {
  return {
    id: Number(raw.id),
    kind: 'header',
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    status: raw.status === 'published' ? 'published' : 'draft',
    is_site_default: Boolean(raw.is_site_default),
    created_at: (raw.created_at as string) ?? null,
    updated_at: (raw.updated_at as string) ?? null,
  };
}

export const useHeadersList = routeLoader$(async ({ cookie, request, params }) => {
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.APPEARANCE.HEADERS);
    const body = (res as { data?: unknown })?.data ?? res;
    const rows = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [];
    return rows.map((x) => mapLayout(x as Record<string, unknown>));
  } catch {
    return [] as ChromeLayoutMeta[];
  }
});

export default component$(() => {
  const list = useHeadersList();
  return <ChromeLayoutListPage kind="header" initialItems={list.value} />;
});

export const head: DocumentHead = {
  title: 'Headers',
};
