import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

export interface CardProps extends Omit<QwikIntrinsicElements['div'], 'class'> {
  padding?: 'none' | 'sm' | 'md';
  class?: string;
}

export const Card = component$<CardProps>(
  ({ padding = 'md', class: className = '', ...props }) => {
    const paddingClass =
      padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-6';
    return (
      <div
        class={`rounded-xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none ${paddingClass} ${className}`.trim()}
        {...props}
      >
        <Slot />
      </div>
    );
  }
);
