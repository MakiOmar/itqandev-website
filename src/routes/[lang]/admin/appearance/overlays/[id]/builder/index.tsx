import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { ChromeAppearanceBuilder } from '~/components/admin/appearance/ChromeAppearanceBuilder';

export const useOverlayBuilderId = routeLoader$(({ params, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  return id;
});

export default component$(() => {
  const id = useOverlayBuilderId();
  return <ChromeAppearanceBuilder kind="overlay" layoutId={id.value as number} />;
});

export const head: DocumentHead = { title: 'Overlay builder' };
