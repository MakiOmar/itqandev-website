import { component$, useVisibleTask$, useSignal } from '@builder.io/qwik';

/**
 * Lazy Lottie surface. Playback is skipped when the user prefers reduced motion.
 */
export const LottiePlayer = component$<{
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  playInView?: boolean;
}>((props) => {
  const host = useSignal<HTMLDivElement>();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => props.src);
    const el = host.value;
    if (!el || !props.src || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-reduced-motion', '1');
      return;
    }
    try {
      const mod = await import('lottie-web');
      const lottie = (mod as { default?: typeof import('lottie-web') }).default || mod;
      const anim = (lottie as { loadAnimation: (opts: Record<string, unknown>) => { destroy: () => void; setSpeed: (n: number) => void } }).loadAnimation({
        container: el,
        renderer: 'svg',
        loop: props.loop !== false,
        autoplay: props.autoplay !== false,
        path: props.src,
      });
      anim.setSpeed(props.speed && props.speed > 0 ? props.speed : 1);
      cleanup(() => anim.destroy());
    } catch {
      el.setAttribute('data-ready', '0');
    }
  });

  return (
    <div
      ref={host}
      class="b-lottie-player mx-auto max-h-80 w-full"
      data-lottie-src={props.src}
      role="img"
      aria-label="Animation"
    />
  );
});
