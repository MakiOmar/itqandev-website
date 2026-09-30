import { component$, Slot } from '@builder.io/qwik';

export type InspectorAccordionProps = {
  title: string;
  /** Sections sharing a group behave as an exclusive accordion (native `<details name>`). */
  group?: string;
  open?: boolean;
};

/**
 * Collapsible inspector section (Elementor-style). Native `<details>` keeps open state in the DOM,
 * so builder re-renders on every edit do not collapse the section being edited.
 */
export const InspectorAccordion = component$<InspectorAccordionProps>((props) => {
  return (
    <details
      {...{ name: props.group }}
      open={props.open}
      class="group/acc border-b border-gray-200 last:border-b-0 dark:border-gray-700"
    >
      <summary class="flex cursor-pointer list-none items-center gap-2 py-2.5 text-xs font-semibold text-gray-800 select-none hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400 [&::-webkit-details-marker]:hidden">
        {/* Caret: points to the reading direction when closed, down when open */}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          aria-hidden="true"
          class="shrink-0 transition-transform rtl:-scale-x-100 group-open/acc:rotate-90 rtl:group-open/acc:-rotate-90"
        >
          <path fill="currentColor" d="M9 6l6 6-6 6z" />
        </svg>
        {props.title}
      </summary>
      <div class="space-y-3 pb-3">
        <Slot />
      </div>
    </details>
  );
});
