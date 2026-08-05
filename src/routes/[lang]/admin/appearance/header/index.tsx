import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { ChromeAppearanceBuilder } from '~/components/admin/appearance/ChromeAppearanceBuilder';

export default component$(() => <ChromeAppearanceBuilder kind="header" />);

export const head: DocumentHead = {
  title: 'Header builder',
};
