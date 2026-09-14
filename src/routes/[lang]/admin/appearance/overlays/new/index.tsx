import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { ChromeLayoutCreatePage } from '~/components/admin/appearance/ChromeLayoutCreatePage';

export default component$(() => <ChromeLayoutCreatePage kind="overlay" />);

export const head: DocumentHead = { title: 'New overlay' };
