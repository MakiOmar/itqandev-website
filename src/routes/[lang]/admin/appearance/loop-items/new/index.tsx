import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { ChromeLayoutCreatePage } from '~/components/admin/appearance/ChromeLayoutCreatePage';

export default component$(() => <ChromeLayoutCreatePage kind="loop_item" />);

export const head: DocumentHead = { title: 'New loop item' };
