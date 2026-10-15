import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { AddonAdminMount } from '~/components/admin/AddonAdminMount';
import { extractCookieHeader } from '~/lib/api/client';
import { isAddonModuleOnForRequest } from '~/lib/addons/mount';

/** Addon dashboard home: `/{lang}/admin/addons/{module}/`. Deeper screens live in `[...path]`. */
export const useAddonHomeMount = routeLoader$(async ({ params, cookie, request, status }) => {
  const enabled = await isAddonModuleOnForRequest(params.module, extractCookieHeader(cookie, request));
  if (!enabled) {
    status(404);
  }
  return { module: params.module, enabled };
});

export default component$(() => {
  const mount = useAddonHomeMount();
  return <AddonAdminMount module={mount.value.module} path={[]} enabled={mount.value.enabled} />;
});

export const head: DocumentHead = ({ params }) => ({
  title: params.module,
});
