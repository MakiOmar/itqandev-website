import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ChromeAppearanceBuilder } from '~/components/admin/appearance/ChromeAppearanceBuilder';
import { getPageBuilderMarketingSupport } from '~/lib/marketing/content-layer';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';

export const useHeaderBuilderId = routeLoader$(({ params, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  return id;
});

export const useHeaderBuilderPreviewSupport = routeLoader$(async ({ request, params }) => {
  const cookie = request.headers.get('cookie') || '';
  const uiLocale = uiLocaleFromPublicRoute(cookie, params.lang, request.url);
  return getPageBuilderMarketingSupport(uiLocale, { forwardDocumentUrl: request.url });
});

export default component$(() => {
  const id = useHeaderBuilderId();
  const previewSupport = useHeaderBuilderPreviewSupport();
  return (
    <ChromeAppearanceBuilder
      kind="header"
      layoutId={id.value as number}
      previewSupport={previewSupport.value}
    />
  );
});

export const head: DocumentHead = { title: 'Header builder' };
