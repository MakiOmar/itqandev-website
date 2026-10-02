import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';

export type BuilderDynamicTag = {
  id: string;
  group?: string;
  label: string;
};

/** Insert allowlisted {{tag}} tokens into compatible inspector fields; collapsed until asked for. */
export const BuilderDynamicTagChips = component$<{
  tags: BuilderDynamicTag[];
  onInsert$: QRL<(token: string) => void>;
}>((props) => {
  const { lang } = useTranslate();
  const open = useSignal(false);
  if (!props.tags.length) return null;
  return (
    <div class="mt-1">
      {/* Toggle: dynamic tag list */}
      <button
        type="button"
        class="text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400"
        aria-expanded={open.value}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        {'{ } '}
        {translateApp(lang, open.value ? 'appearance.dynamicTagsHide' : 'appearance.dynamicTagsInsert')}
      </button>
      {open.value ? (
        <div class="mt-1 flex flex-wrap gap-1">
          {props.tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              class="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:border-primary-400 dark:border-gray-600 dark:text-gray-300"
              title={`${tag.label} — {{${tag.id}}}`}
              onClick$={() => props.onInsert$(`{{${tag.id}}}`)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
