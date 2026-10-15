import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { AddonAdminMount } from '~/components/admin/AddonAdminMount';
import { extractCookieHeader } from '~/lib/api/client';
import { addonPathSegments, isAddonModuleOnForRequest } from '~/lib/addons/mount';

/** Addon dashboard screens below the home, e.g. `/{lang}/admin/addons/shop/orders/12/`. */
export const useAddonScreenMount = routeLoader$(async ({ params, cookie, request, status }) => {
  const enabled = await isAddonModuleOnForRequest(params.module, extractCookieHeader(cookie, request));
  if (!enabled) {
    status(404);
  }
  return { module: params.module, path: addonPathSegments(params.path), enabled };
});

export default component$(() => {
  const mount = useAddonScreenMount();
  return <AddonAdminMount module={mount.value.module} path={mount.value.path} enabled={mount.value.enabled} />;
});

export const head: DocumentHead = ({ params }) => ({
  title: params.module,
});
