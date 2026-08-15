import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { ThemeTemplateEditorPage } from '~/components/admin/appearance/ThemeTemplateEditorPage';

export default component$(() => <ThemeTemplateEditorPage mode="create" />);

export const head: DocumentHead = { title: 'New theme template' };
