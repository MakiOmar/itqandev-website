import { component$, Slot, type QwikIntrinsicElements } from '@builder.io/qwik';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface ButtonProps extends Omit<QwikIntrinsicElements['button'], 'class'> {
  variant?: ButtonVariant;
  href?: string;
  class?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-primary-300 bg-primary-100 text-primary-900 hover:bg-primary-200 focus-visible:ring-primary-500 dark:border-primary-400 dark:bg-primary-100 dark:text-primary-900 dark:hover:bg-primary-200',
  secondary:
    'bg-slate-700 text-white hover:bg-slate-800 focus-visible:ring-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700',
  outline:
    'border-2 border-primary-600 text-primary-800 hover:bg-primary-50 light:border-primary-600 light:text-primary-800 light:hover:bg-primary-50 dark:border-primary-300 dark:text-primary-100 dark:hover:bg-primary-950/40',
  ghost:
    'light:text-slate-900 light:hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
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
