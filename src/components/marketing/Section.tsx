import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

export interface SectionProps extends Omit<QwikIntrinsicElements['section'], 'class'> {
  /** Optional background: default, muted, gradient */
  variant?: 'default' | 'muted' | 'gradient';
  class?: string;
}

export const Section = component$<SectionProps>(
  ({ variant = 'default', class: className = '', ...props }) => {
    const variantClass =
      variant === 'muted'
        ? 'bg-slate-100/80 dark:bg-slate-800/50'
        : variant === 'gradient'
          ? 'bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800'
          : '';
    return (
      <section
        class={`py-16 sm:py-20 lg:py-24 ${variantClass} ${className}`.trim()}
        {...props}
      >
        <Slot />
      </section>
    );
  }
);
