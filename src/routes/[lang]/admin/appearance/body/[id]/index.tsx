import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ChromeLayoutEditPage } from '~/components/admin/appearance/ChromeLayoutEditPage';
import { adminApiClient } from '~/lib/admin/admin-api-client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import type { ChromeLayoutMeta } from '~/types/chrome-layout';

export const useBodyLayout = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.APPEARANCE.BODY_GET(id));
    const raw = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return {
      id: Number(raw.id),
      kind: 'body',
      name: String(raw.name ?? ''),
      slug: String(raw.slug ?? ''),
      status: raw.status === 'published' ? 'published' : 'draft',
      is_site_default: Boolean(raw.is_site_default),
    } satisfies ChromeLayoutMeta;
  } catch {
    return fail(404, { message: 'Body layout not found' });
  }
});

export default component$(() => {
  const layout = useBodyLayout();
  return <ChromeLayoutEditPage kind="body" layout={layout.value as ChromeLayoutMeta} />;
});

export const head: DocumentHead = { title: 'Edit body layout' };
