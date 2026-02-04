import { component$, $ } from '@builder.io/qwik';

/**
 * Dark mode toggle component - Floating icon button
 * Follows Qwik's official theme management pattern from:
 * https://qwik.dev/docs/cookbook/theme-management/
 */
export const DarkModeToggle = component$(() => {
  // Toggle theme following Qwik's official pattern
  const toggleTheme = $(() => {
    if (typeof window === 'undefined') return;
    
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    // Remove both classes, then add the new one
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  return (
    <>
      {/* Component: DarkModeToggle */}
      <button
        onClick$={toggleTheme}
        type="button"
        class="fixed bottom-6 ltr:right-6 rtl:left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-110"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        {/* Sun Icon (shown in dark mode - click to switch to light) */}
        <svg
          class="h-6 w-6 text-amber-500 hidden dark:block transition-all duration-300"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clip-rule="evenodd"
          />
        </svg>
        
        {/* Moon Icon (shown in light mode - click to switch to dark) */}
        <svg
          class="h-6 w-6 text-blue-400 block dark:hidden transition-all duration-300"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
    </>
  );
});
