import { component$, Slot } from '@builder.io/qwik';

/**
 * Public site layout (no sidebar, minimal header)
 */
export default component$(() => {
  return (
    <>
      {/* Component: PublicLayout */}
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 transition-colors duration-300">
        <main class="flex-1 overflow-y-auto">
          <Slot />
        </main>
      </div>
    </>
  );
});
