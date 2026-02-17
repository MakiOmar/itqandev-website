import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface ButtonProps extends Omit<QwikIntrinsicElements['button'], 'class'> {
  variant?: ButtonVariant;
  href?: string;
  class?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600',
  secondary:
    'bg-slate-700 text-white hover:bg-slate-800 focus-visible:ring-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700',
  outline:
    'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/20',
  ghost:
    'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};

export const Button = component$<ButtonProps>(({ variant = 'primary', href, class: className = '', ...props }) => {
  const base =
    'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const combined = `${base} ${variantClasses[variant]} ${className}`.trim();

  if (href) {
    return (
      <a href={href} class={combined} {...(props as QwikIntrinsicElements['a'])}>
        <Slot />
      </a>
    );
  }

  return (
    <button type="button" class={combined} {...props}>
      <Slot />
    </button>
  );
});
