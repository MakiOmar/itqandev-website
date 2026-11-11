/**
 * Advanced → Attributes: CSS ID and CSS classes for a builder node (band, row, column, widget).
 */
import { component$, useSignal, useTask$, $, type QRL } from '@builder.io/qwik';
import {
  normalizeCssClasses,
  normalizeCssId,
  type BuilderNodeAttrs,
} from '~/lib/marketing/builder-node-attrs';
import { translateApp } from '~/lib/i18n/useTranslate';

const INPUT_CLASS =
  'mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-slate-950';

export const BuilderCssAttributesFields = component$<{
  lang: string;
  cssId?: string;
  cssClasses?: string;
  onChange$: QRL<(next: BuilderNodeAttrs) => void | Promise<void>>;
}>((props) => {
  const cssId = useSignal(props.cssId ?? '');
  const cssClasses = useSignal(props.cssClasses ?? '');

  useTask$(({ track }) => {
    cssId.value = track(() => props.cssId) ?? '';
    cssClasses.value = track(() => props.cssClasses) ?? '';
  });

  /** Saves on change (blur / Enter) so typing doesn't add an undo step per key. */
  const save$ = $(async (key: 'css_id' | 'css_classes', raw: string): Promise<string> => {
    const value = key === 'css_id' ? normalizeCssId(raw) : normalizeCssClasses(raw);
    if (key === 'css_id') cssId.value = value;
    else cssClasses.value = value;
    await props.onChange$({ css_id: cssId.value, css_classes: cssClasses.value });
    return value;
  });

  return (
    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'builder.advanced.attributes')}
      </p>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
        {translateApp(props.lang, 'builder.advanced.cssId')}
        <input
          type="text"
          dir="ltr"
          maxLength={64}
          spellcheck={false}
          autoComplete="off"
          class={INPUT_CLASS}
          value={cssId.value}
          onChange$={async (_, el) => {
            el.value = await save$('css_id', el.value);
          }}
        />
        <span class="mt-1 block text-[11px] font-normal leading-snug text-gray-500 dark:text-gray-400">
          {translateApp(props.lang, 'builder.advanced.cssIdHint')}
        </span>
      </label>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
        {translateApp(props.lang, 'builder.advanced.cssClasses')}
        <input
          type="text"
          dir="ltr"
          spellcheck={false}
          autoComplete="off"
          class={INPUT_CLASS}
          value={cssClasses.value}
          onChange$={async (_, el) => {
            el.value = await save$('css_classes', el.value);
          }}
        />
        <span class="mt-1 block text-[11px] font-normal leading-snug text-gray-500 dark:text-gray-400">
          {translateApp(props.lang, 'builder.advanced.cssClassesHint')}
        </span>
      </label>
    </div>
  );
});
