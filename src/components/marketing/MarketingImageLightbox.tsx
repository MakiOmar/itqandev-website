import {
  component$,
  Slot,
  useSignal,
  useVisibleTask$,
  type QwikIntrinsicElements,
} from '@builder.io/qwik';

export type MarketingImageLightboxProps = Omit<QwikIntrinsicElements['div'], 'class'> & {
  class?: string;
};

/**
 * Wraps marketing article imagery; clicking any descendant <img> opens a fullscreen-style preview.
 * Skips images inside links and any img with `data-no-lightbox`.
 */
export const MarketingImageLightbox = component$<MarketingImageLightboxProps>(
  ({ class: className = '', ...rest }) => {
    const root = useSignal<HTMLElement>();
    const open = useSignal(false);
    const src = useSignal('');
    const alt = useSignal('');

    // eslint-disable-next-line qwik/no-use-visible-task -- DOM listeners for delegated image clicks
    useVisibleTask$(({ cleanup }) => {
      const el = root.value;
      if (!el) return;

      const onClick = (e: MouseEvent) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const img = t.closest('img');
        if (!img || !el.contains(img)) return;
        if (img.closest('a[href]')) return;
        if (img.hasAttribute('data-no-lightbox')) return;
        const s = (img as HTMLImageElement).currentSrc || img.getAttribute('src') || '';
        if (!s || s.startsWith('data:')) return;
        e.preventDefault();
        src.value = s;
        alt.value = img.getAttribute('alt') || '';
        open.value = true;
      };

      el.addEventListener('click', onClick);
      cleanup(() => el.removeEventListener('click', onClick));
    });

    // eslint-disable-next-line qwik/no-use-visible-task -- Escape to close
    useVisibleTask$(({ track, cleanup }) => {
      track(() => open.value);
      if (!open.value || typeof document === 'undefined') return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') open.value = false;
      };
      document.addEventListener('keydown', onKey);
      cleanup(() => document.removeEventListener('keydown', onKey));
    });

    // eslint-disable-next-line qwik/no-use-visible-task -- lock body scroll while open
    useVisibleTask$(({ track, cleanup }) => {
      track(() => open.value);
      if (typeof document === 'undefined') return;
      if (!open.value) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      cleanup(() => {
        document.body.style.overflow = prev;
      });
    });

    return (
      <>
        <div
          ref={root}
          class={[
            '[&_img:not([data-no-lightbox])]:cursor-zoom-in',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          <Slot />
        </div>

        {open.value && (
          <div
            class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick$={(e) => {
              if (e.target === e.currentTarget) {
                open.value = false;
              }
            }}
          >
            {/* Close */}
            <button
              type="button"
              class="absolute end-4 top-4 z-[101] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick$={() => {
                open.value = false;
              }}
              aria-label="Close image preview"
            >
              <span aria-hidden="true">×</span>
            </button>
            {/* eslint-disable-next-line qwik/jsx-img -- full-size preview of user content */}
            <img
              src={src.value}
              alt={alt.value}
              class="max-h-[min(90vh,100%)] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
              onClick$={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }
);
