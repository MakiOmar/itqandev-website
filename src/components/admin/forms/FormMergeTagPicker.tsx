import { component$, type QRL } from '@builder.io/qwik';

const SYSTEM_TAGS = ['form_title', 'submitted_at'] as const;

/** Append allowlisted merge tags into the current action setting. */
export const FormMergeTagPicker = component$<{
  fieldIds: string[];
  onInsert$: QRL<(token: string) => void>;
}>((props) => {
  const tags = [...SYSTEM_TAGS, ...props.fieldIds.filter(Boolean)];
  return (
    <div class="space-y-1">
      <p class="text-[11px] text-gray-500">Merge tags</p>
      <div class="flex flex-wrap gap-1">
        {tags.map((id) => (
          <button
            key={id}
            type="button"
            class="rounded border border-gray-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-600"
            onClick$={() => props.onInsert$(`{{${id}}}`)}
          >
            {`{{${id}}}`}
          </button>
        ))}
      </div>
    </div>
  );
});
