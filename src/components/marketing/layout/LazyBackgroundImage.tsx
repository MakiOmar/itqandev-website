import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { LAZY_BACKGROUND_VAR } from '~/lib/marketing/builder-background';

export type LazyBackgroundImageProps = {
  /** Inline background style whose image URL sits in `LAZY_BACKGROUND_VAR` instead of `background-image`. */
  style: Record<string, string>;
};

/** Starts the download a little before the layer scrolls into view so the image is ready on arrival. */
const PRELOAD_MARGIN = '300px 0px';

/** Image background layer that fetches its image only when it nears the viewport. */
export const LazyBackgroundImage = component$<LazyBackgroundImageProps>((props) => {
  const layerRef = useSignal<HTMLDivElement>();
  const inView = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    ({ cleanup }) => {
      const el = layerRef.value;
      if (!el) return;
      if (typeof IntersectionObserver === 'undefined') {
        inView.value = true;
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          inView.value = true;
          io.disconnect();
        },
        { rootMargin: PRELOAD_MARGIN },
      );
      io.observe(el);
      cleanup(() => io.disconnect());
    },
    { strategy: 'document-ready' },
  );

  return (
    <div
      ref={layerRef}
      class="absolute inset-0"
      style={inView.value ? { ...props.style, backgroundImage: `var(${LAZY_BACKGROUND_VAR})` } : props.style}
    />
  );
});
