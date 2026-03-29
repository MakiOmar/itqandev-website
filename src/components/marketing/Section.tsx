import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

export interface SectionProps extends Omit<QwikIntrinsicElements['section'], 'class'> {
  /** Optional background: default, muted, gradient */
  variant?: 'default' | 'muted' | 'gradient';
  class?: string;
}

export const Section = component$<SectionProps>(
  ({ variant = 'default', class: className = '', ...props }) => {
    // Light: lower fill opacity + blur so fixed canvas particles read through; dark unchanged
    const variantClass =
      variant === 'muted'
        ? 'bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50 dark:backdrop-blur-none'
        : variant === 'gradient'
          ? 'bg-gradient-to-b from-slate-50/80 via-white/70 to-white/60 backdrop-blur-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:backdrop-blur-none'
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
