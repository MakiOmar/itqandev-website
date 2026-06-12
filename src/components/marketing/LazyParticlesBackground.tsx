import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { ParticlesBackground } from './ParticlesBackground';

/** Defers particles chunk until after first paint. */
export const LazyParticlesBackground = component$(() => {
  const ready = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    ready.value = true;
  });

  return ready.value ? <ParticlesBackground /> : null;
});
