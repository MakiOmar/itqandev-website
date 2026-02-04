import { useSignal, useVisibleTask$, $, type Signal } from '@builder.io/qwik';

/**
 * Hook for debouncing signal values
 * @param source - The source signal to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced signal
 */
export function useDebounce<T>(source: Signal<T>, delay = 300): Signal<T> {
  const debounced = useSignal<T>(source.value);

  useVisibleTask$(({ track, cleanup }) => {
    track(() => source.value);

    const timeoutId = setTimeout(() => {
      debounced.value = source.value;
    }, delay);

    cleanup(() => {
      clearTimeout(timeoutId);
    });
  });

  return debounced;
}

/**
 * Hook for debouncing function calls
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced function
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return $((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  });
}
