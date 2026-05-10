import { $, component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import type { QRL } from '@builder.io/qwik';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';

const tinymcePlugins = [
  'lists',
  'link',
  'table',
  'image',
  'media',
  'code',
  'fullscreen',
  'wordcount',
];

type TinyMceApi = {
  get: (id: string) => any;
  init: (options: Record<string, unknown>) => Promise<unknown>;
};

const getGlobalTinyMce = (): TinyMceApi | undefined =>
  (globalThis as unknown as { tinymce?: TinyMceApi }).tinymce;

const loadTinyMce = async (): Promise<TinyMceApi | undefined> => {
  await import('tinymce/tinymce');
  const tinymce = getGlobalTinyMce();
  if (!tinymce) {
    return undefined;
  }

  await import('tinymce/icons/default');
  await import('tinymce/themes/silver');
  await import('tinymce/models/dom');
  await import('tinymce/plugins/lists');
  await import('tinymce/plugins/link');
  await import('tinymce/plugins/table');
  await import('tinymce/plugins/image');
  await import('tinymce/plugins/media');
  await import('tinymce/plugins/code');
  await import('tinymce/plugins/fullscreen');
  await import('tinymce/plugins/wordcount');

  return tinymce;
};

export const RichTextEditorField = component$<{
  id: string;
  name?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  onValueChange$?: QRL<(value: string) => void>;
}>((props) => {
  const mode = useSignal<'visual' | 'source'>('visual');
  const html = useSignal(props.value ?? '');
  const editorId = `${props.id}-tinymce`;
  const hiddenInputId = `${props.id}-rich-text-value`;

  useTask$(({ track }) => {
    track(() => props.value);
    html.value = props.value ?? '';
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => mode.value);

    if (mode.value !== 'visual') {
      return;
    }

    const target = document.getElementById(editorId) as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }

    let tinymce: TinyMceApi | undefined;
    try {
      tinymce = await loadTinyMce();
      if (!tinymce) {
        return;
      }

      tinymce.get(editorId)?.remove();

      await tinymce.init({
        target,
        skin: false,
        content_css: false,
        license_key: 'gpl',
        menubar: false,
        branding: false,
        promotion: false,
        height: 360,
        plugins: tinymcePlugins.join(' '),
        toolbar_mode: 'wrap',
        toolbar:
          'blocks | bold italic underline strikethrough | bullist numlist blockquote | alignleft aligncenter alignright | link unlink | table image media | code fullscreen',
        block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
        directionality: props.dir ?? 'ltr',
        placeholder: props.placeholder,
        content_style:
          'body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.7; }',
        setup: (editor: any) => {
          const syncFromEditor = () => {
            const hiddenInput = document.getElementById(hiddenInputId) as HTMLInputElement | null;
            if (hiddenInput) {
              hiddenInput.value = editor.getContent();
            }
          };

          editor.on('init', () => {
            editor.setContent(html.value ?? '');
            syncFromEditor();
          });
          editor.on('change keyup input undo redo', syncFromEditor);
        },
      });
    } catch (error) {
      console.error('Failed to initialize TinyMCE editor:', error);
    }

    cleanup(() => {
      tinymce?.get(editorId)?.remove();
    });
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.value);

    const editor = getGlobalTinyMce()?.get(editorId);
    const nextValue = props.value ?? '';
    if (editor && editor.getContent() !== nextValue) {
      editor.setContent(nextValue);
    }
  });

  const syncValue = $(async (value: string) => {
    html.value = value;
    const hiddenInput = document.getElementById(hiddenInputId) as HTMLInputElement | null;
    if (hiddenInput) {
      hiddenInput.value = value;
    }
    await props.onValueChange$?.(value);
  });

  const syncVisualEditor = $(async () => {
    if (typeof document !== 'undefined' && mode.value === 'visual') {
      const editor = getGlobalTinyMce()?.get(editorId);
      if (editor) {
        await syncValue(editor.getContent());
      }
    }
  });

  return (
    <div class="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-primary-500 focus-within:ring focus-within:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:ring-primary-700/40">
      {props.name ? <input id={hiddenInputId} type="hidden" name={props.name} value={html.value} required={props.required} /> : null}

      <div class="flex flex-wrap items-center justify-end gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950/70">
        <div class="flex rounded-md border border-gray-200 bg-white p-0.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-950">
          <button
            type="button"
            class={`rounded px-2 py-1 transition ${
              mode.value === 'visual'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            aria-pressed={mode.value === 'visual'}
            onClick$={async () => {
              await syncVisualEditor();
              mode.value = 'visual';
            }}
          >
            Visual
          </button>
          <button
            type="button"
            class={`rounded px-2 py-1 transition ${
              mode.value === 'source'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            aria-pressed={mode.value === 'source'}
            onClick$={async () => {
              await syncVisualEditor();
              mode.value = 'source';
            }}
          >
            Code
          </button>
        </div>
      </div>

      {mode.value === 'visual' ? (
        <textarea
          id={editorId}
          value={html.value}
          placeholder={props.placeholder}
          dir={props.dir}
          lang={props.lang}
          class="min-h-40 w-full border-0 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-0 dark:bg-gray-900 dark:text-gray-100"
        />
      ) : (
        <textarea
          id={`${props.id}-source`}
          value={html.value}
          placeholder={props.placeholder}
          dir={props.dir}
          lang={props.lang}
          class="min-h-40 w-full border-0 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:ring-0 dark:bg-gray-900 dark:text-gray-100"
          onInput$={(event) => {
            syncValue((event.target as HTMLTextAreaElement).value);
          }}
        />
      )}
    </div>
  );
});
