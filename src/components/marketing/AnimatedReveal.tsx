import { component$, Slot, useSignal, useVisibleTask$, type QwikIntrinsicElements } from '@builder.io/qwik';

export interface AnimatedRevealProps extends Omit<QwikIntrinsicElements['div'], 'class'> {
  /** Animation delay in ms (stagger children) */
  delay?: number;
  class?: string;
}

/**
 * Reveal-on-scroll wrapper using IntersectionObserver.
 * Respects prefers-reduced-motion (no or minimal animation).
 */
export const AnimatedReveal = component$<AnimatedRevealProps>(
  ({ delay = 0, class: className = '', ...props }) => {
    const ref = useSignal<HTMLElement>();
    const visible = useSignal(false);

    // eslint-disable-next-line qwik/no-use-visible-task -- IntersectionObserver must run in browser
    useVisibleTask$(({ cleanup }) => {
      const el = ref.value;
      if (!el || typeof window === 'undefined') return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        visible.value = true;
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            const t = setTimeout(() => {
              visible.value = true;
            }, delay);
            cleanup(() => clearTimeout(t));
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );

      observer.observe(el);
      cleanup(() => observer.disconnect());
    });

    return (
      <div
        ref={ref}
        class={[
          'transition-all duration-700 ease-out',
          visible.value
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8',
          className,
        ].join(' ')}
        {...props}
      >
        <Slot />
      </div>
    );
  }
);
