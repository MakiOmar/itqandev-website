import { component$, type QRL } from '@builder.io/qwik';

export type BuilderDynamicTag = {
  id: string;
  group?: string;
  label: string;
};

/** Insert allowlisted {{tag}} tokens into compatible inspector fields. */
export const BuilderDynamicTagChips = component$<{
  tags: BuilderDynamicTag[];
  onInsert$: QRL<(token: string) => void>;
}>((props) => {
  if (!props.tags.length) return null;
  return (
    <div class="mt-1 flex flex-wrap gap-1">
      {props.tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          class="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:border-primary-400 dark:border-gray-600 dark:text-gray-300"
          title={tag.label}
          onClick$={() => props.onInsert$(`{{${tag.id}}}`)}
        >
          {tag.id}
        </button>
      ))}
    </div>
  );
});
