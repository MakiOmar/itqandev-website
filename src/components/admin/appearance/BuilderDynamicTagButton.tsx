import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';

export type BuilderDynamicTag = {
  id: string;
  group?: string;
  label: string;
};

type TagGroup = { id: string; tags: BuilderDynamicTag[] };

function groupTags(tags: BuilderDynamicTag[]): TagGroup[] {
  const groups: TagGroup[] = [];
  for (const tag of tags) {
    const id = tag.group || 'site';
    const group = groups.find((g) => g.id === id);
    if (group) group.tags.push(tag);
    else groups.push({ id, tags: [tag] });
  }
  return groups;
}

/**
 * Inline dynamic-tag trigger for the end of a text / URL / textarea input. The parent wrapper
 * must be `relative` and give the input end padding (`pe-8`). Picking a tag appends `{{id}}`.
 */
export const BuilderDynamicTagButton = component$<{
  tags: BuilderDynamicTag[];
  lang: string;
  onInsert$: QRL<(token: string) => void>;
  /** Top-align the trigger (multi-line inputs). */
  top?: boolean;
}>((props) => {
  const open = useSignal(false);
  if (!props.tags.length) return null;
  const t = (key: string) => translateApp(props.lang, `appearance.${key}`);
  const groups = groupTags(props.tags);
  const title = t('dynamicTagsInsert');

  return (
    <div
      class={[
        'absolute end-1',
        props.top ? 'top-1' : 'top-1/2 -translate-y-1/2',
        // The transform makes this a stacking context; lift it above later rows while the menu is open.
        open.value ? 'z-50' : '',
      ].join(' ')}
    >
      {/* Trigger: database glyph, like Elementor's dynamic tags button */}
      <button
        type="button"
        class={[
          'flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400',
          open.value ? 'bg-gray-100 text-primary-600 dark:bg-slate-800 dark:text-primary-400' : '',
        ].join(' ')}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open.value}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      </button>
      {open.value ? (
        <>
          {/* Click-away layer */}
          <div class="fixed inset-0 z-40" aria-hidden="true" onClick$={() => (open.value = false)} />
          {/* Tag menu, grouped by tag source */}
          <div
            role="menu"
            aria-label={title}
            class="absolute end-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-slate-900"
            window:onKeyDown$={(e) => {
              if ((e as KeyboardEvent).key === 'Escape') open.value = false;
            }}
          >
            {groups.map((group) => (
              <div key={group.id}>
                <p class="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {translateApp(props.lang, `appearance.dynamicTagGroups.${group.id}`)}
                </p>
                {group.tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    role="menuitem"
                    class="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-start text-xs text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                    onClick$={async () => {
                      open.value = false;
                      await props.onInsert$(`{{${tag.id}}}`);
                    }}
                  >
                    <span class="truncate">{tag.label}</span>
                    <code class="shrink-0 text-[10px] text-gray-400" dir="ltr">{`{{${tag.id}}}`}</code>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
});
