import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { ParticlesBackground, type ParticlesBackgroundProps } from './ParticlesBackground';

/** Mount hero particles after first client paint (keeps canvas out of SSR HTML). */
export const LazyParticlesBackground = component$<ParticlesBackgroundProps>((props) => {
  const ready = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    ready.value = true;
  });

  return ready.value ? (
    <ParticlesBackground
      layout={props.layout ?? 'contained'}
      density={props.density}
      speed={props.speed}
      opacity={props.opacity}
      size={props.size}
      color={props.color}
    />
  ) : null;
});
