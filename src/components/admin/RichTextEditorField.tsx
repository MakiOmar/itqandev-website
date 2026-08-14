import { $, component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import type { QRL } from '@builder.io/qwik';
import { loadTinyMce, TINYMCE_PLUGIN_LIST } from '../../lib/admin/tinymce-loader';

type TinyMceEditor = {
  getContent: () => string;
  setContent: (html: string) => void;
  remove: () => void;
  getBody: () => HTMLElement;
  getDoc: () => Document;
};

type TinyMceApi = {
  get: (id: string) => TinyMceEditor | undefined;
  init: (options: Record<string, unknown>) => Promise<unknown>;
};

function getGlobalTinyMce(): TinyMceApi | undefined {
  return (globalThis as unknown as { tinymce?: TinyMceApi }).tinymce;
}

/** Prefer explicit prop; otherwise match the page (`body` / `html`) direction. */
function resolveEditorDir(propDir: 'ltr' | 'rtl' | undefined): 'ltr' | 'rtl' {
  if (propDir === 'rtl' || propDir === 'ltr') {
    return propDir;
  }
  if (typeof document === 'undefined') {
    return 'ltr';
  }
  const pageDir =
    document.body?.getAttribute('dir') ||
    document.documentElement.getAttribute('dir') ||
    '';
  return pageDir.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
}

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
  const editorDir = useSignal<'ltr' | 'rtl'>(props.dir ?? 'ltr');
  const editorId = `${props.id}-tinymce`;
  const hiddenInputId = `${props.id}-rich-text-value`;

  useTask$(({ track }) => {
    track(() => props.value);
    html.value = props.value ?? '';
  });

  useTask$(({ track }) => {
    track(() => props.dir);
    if (props.dir === 'rtl' || props.dir === 'ltr') {
      editorDir.value = props.dir;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.dir);
    editorDir.value = resolveEditorDir(props.dir);
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => mode.value);
    track(() => editorDir.value);

    if (mode.value !== 'visual') {
      return;
    }

    const initialHtml = html.value ?? '';
    const dir = editorDir.value;

    const target = document.getElementById(editorId) as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }

    let tinymce: TinyMceApi | undefined;
    try {
      tinymce = await loadTinyMce();
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
        plugins: TINYMCE_PLUGIN_LIST,
        toolbar_mode: 'wrap',
        toolbar:
          'blocks | bold italic underline strikethrough | bullist numlist blockquote | alignleft aligncenter alignright | link unlink | table image media | code fullscreen',
        block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
        directionality: dir,
        placeholder: props.placeholder,
        // Iframe inherits html.dark color-scheme; without explicit colors, body text is invisible.
        content_style: [
          `html { color-scheme: light; background: #fff; direction: ${dir}; }`,
          'body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
          `font-size: 14px; line-height: 1.7; color: #111827; background: #fff; margin: 12px; direction: ${dir};`,
          dir === 'rtl' ? 'text-align: right;' : 'text-align: left;',
          '}',
          'a { color: #2563eb; }',
        ].join(' '),
        setup: (editor: TinyMceEditor & { on: (ev: string, fn: () => void) => void }) => {
          const syncFromEditor = () => {
            const next = editor.getContent();
            html.value = next;
            const hiddenInput = document.getElementById(hiddenInputId) as HTMLInputElement | null;
            if (hiddenInput) {
              hiddenInput.value = next;
            }
          };

          editor.on('init', () => {
            const body = editor.getBody();
            const doc = editor.getDoc();
            body.setAttribute('dir', dir);
            doc.documentElement.setAttribute('dir', dir);
            editor.setContent(initialHtml);
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
    <div
      dir={editorDir.value}
      class="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-primary-500 focus-within:ring focus-within:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:ring-primary-700/40"
    >
      {props.name ? (
        <input id={hiddenInputId} type="hidden" name={props.name} value={html.value} required={props.required} />
      ) : null}

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
          dir={editorDir.value}
          lang={props.lang}
          class="min-h-40 w-full border-0 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-0 dark:bg-gray-900 dark:text-gray-100"
        />
      ) : (
        <textarea
          id={`${props.id}-source`}
          value={html.value}
          placeholder={props.placeholder}
          dir={editorDir.value}
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
