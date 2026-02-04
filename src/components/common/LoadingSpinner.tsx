import { component$ } from '@builder.io/qwik';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

/**
 * Loading spinner component
 */
export const LoadingSpinner = component$<LoadingSpinnerProps>((props) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <>
      {/* Component: LoadingSpinner */}
      <div
        class={`flex items-center justify-center ${props.class || ''}`}
        role="status"
        aria-label="Loading"
      >
      <div
        class={`${sizeClasses[props.size || 'md']} animate-spin rounded-full border-4 border-primary border-t-transparent`}
      ></div>
      <span class="sr-only">Loading...</span>
    </div>
    </>
  );
});
