import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

export interface ContainerProps extends Omit<QwikIntrinsicElements['div'], 'class'> {
  size?: 'default' | 'narrow' | 'wide';
  class?: string;
}

export const Container = component$<ContainerProps>(
  ({ size = 'default', class: className = '', ...props }) => {
    const sizeClass =
      size === 'narrow'
        ? 'max-w-3xl'
        : size === 'wide'
          ? 'max-w-7xl'
          : 'max-w-6xl';
    return (
      <div
        class={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${sizeClass} ${className}`.trim()}
        {...props}
      >
        <Slot />
      </div>
    );
  }
);
