import { component$, Slot } from '@builder.io/qwik';

/**
 * Error boundary component for catching and displaying errors
 * Note: Qwik handles route loader errors automatically, this is for component-level errors
 */
export const ErrorBoundary = component$(() => {
  return <Slot />;
});
