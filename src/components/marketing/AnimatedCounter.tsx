import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

/**
 * Animated counter that respects prefers-reduced-motion.
 */
export const AnimatedCounter = component$<{ value: number; label: string }>(({ value, label }) => {
  const count = useSignal(0);
  const ref = useSignal<HTMLElement>();

  // eslint-disable-next-line qwik/no-use-visible-task -- IntersectionObserver for viewport
  useVisibleTask$(({ cleanup }) => {
    const el = ref.value;
    if (!el || typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      count.value = value;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const duration = 1500;
        const start = 0;
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          count.value = Math.round(start + (value - start) * progress);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    cleanup(() => observer.disconnect());
  });

  return (
    <div ref={ref} class="text-center">
      <p class="text-3xl font-bold text-primary-600 dark:text-primary-400 sm:text-4xl">{count.value}</p>
      <p class="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
});
