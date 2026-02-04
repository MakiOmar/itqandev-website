import { component$, Slot } from '@builder.io/qwik';

interface PageHeaderProps {
  title: string;
  description?: string;
  class?: string;
}

/**
 * Page header component with title and optional description
 * Use children/slot for action buttons
 */
export const PageHeader = component$<PageHeaderProps>((props) => {
  return (
    <>
      {/* Component: PageHeader */}
      <div class={`mb-6 sm:mb-8 md:mb-10 lg:mb-12 ${props.class || ''}`}>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 bg-clip-text text-transparent tracking-tight mb-3 md:mb-4 leading-tight">{props.title}</h1>
            {props.description && (
              <p class="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-2xl mt-2">{props.description}</p>
            )}
          </div>
          <div class="flex-shrink-0">
            <Slot />
          </div>
        </div>
      </div>
    </>
  );
});
