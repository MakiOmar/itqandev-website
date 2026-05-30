import { component$, useSignal, useVisibleTask$, type Component } from '@builder.io/qwik';
import type { QRL } from '@builder.io/qwik';

type RichTextProps = {
  id: string;
  name?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  onValueChange$?: QRL<(value: string) => void>;
};

/**
 * Defers `RichTextEditorField` + TinyMCE until mount so admin list routes do not
 * download the ~1.3MB editor bundle.
 */
export const LazyRichTextEditorField = component$<RichTextProps>((props) => {
  const Editor = useSignal<Component<RichTextProps> | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const mod = await import('./RichTextEditorField');
    Editor.value = mod.RichTextEditorField;
  });

  if (!Editor.value) {
    return (
      <textarea
        id={`${props.id}-fallback`}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        dir={props.dir}
        lang={props.lang}
        rows={6}
        class="min-h-40 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        readOnly
        aria-busy="true"
        aria-label="Loading editor"
      />
    );
  }

  const RichTextEditorField = Editor.value;
  return <RichTextEditorField {...props} />;
});
