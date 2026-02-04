import { component$, Slot, type Component } from '@builder.io/qwik';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: Component<any>;
  action?: {
    label: string;
    onClick$: () => void;
  };
  class?: string;
}

/**
 * Empty state component for when there's no data
 */
export const EmptyState = component$<EmptyStateProps>((props) => {
  return (
    <>
      {/* Component: EmptyState */}
      <div
        class={`flex flex-col items-center justify-center py-12 text-center ${props.class || ''}`}
      >
      {props.icon && (
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          {(() => {
            const IconComponent = props.icon!;
            return <IconComponent />;
          })()}
        </div>
      )}
      <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {props.title}
      </h3>
      {props.description && (
        <p class="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          {props.description}
        </p>
      )}
      {props.action && (
        <button
          onClick$={props.action.onClick$}
          class="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {props.action.label}
        </button>
      )}
      <Slot />
    </div>
    </>
  );
});
